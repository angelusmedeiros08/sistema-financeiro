import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";
import { hojeIsoBrasil } from "@/lib/data-brasil";
import { aprovarOrcamento, recusarOrcamento } from "./orcamentos-comerciais";
import type { Database } from "@/utils/supabase/database.types";

type StatusOrcamentoComercial = Database["public"]["Enums"]["status_orcamento_comercial"];

export type ItemOrcamentoPublico = {
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
};

export type OrcamentoPublico = {
  numero: number;
  status: StatusOrcamentoComercial;
  // true quando `validade` já passou mas o cron diário ainda não rodou pra
  // marcar EXPIRADO de verdade — a página trata os dois casos igual (mesmo
  // texto, sem os botões de ação), sem esperar o cron pra refletir a
  // realidade.
  efetivamenteExpirado: boolean;
  tenantNome: string;
  clienteNome: string;
  dataEmissao: string;
  validade: string | null;
  formaPagamentoNome: string | null;
  numeroParcelas: number;
  observacoes: string | null;
  itens: ItemOrcamentoPublico[];
  valorTotal: number;
  motivoRecusa: string | null;
};

// Único ponto de leitura pública desta feature — usa o client administrativo
// de propósito (mesmo padrão de /assinar): nunca abre a policy staff-only de
// `orcamentos_comerciais`/`orcamento_comercial_itens` pra `anon`, o token já
// é a autorização, verificado aqui, e só os campos necessários pra exibir a
// proposta voltam pra fora.
export async function buscarOrcamentoPorToken(token: string): Promise<OrcamentoPublico | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orcamentos_comerciais")
    .select(
      "numero, status, data_emissao, validade, numero_parcelas, observacoes, motivo_recusa, pessoas(nome), tenants(nome), formas_pagamento(nome), orcamento_comercial_itens(descricao, quantidade, preco_unitario, valor_total)",
    )
    .eq("token_publico", token)
    .maybeSingle();

  if (!data) return null;

  const itens = (data.orcamento_comercial_itens ?? []).map((i) => ({
    descricao: i.descricao,
    quantidade: Number(i.quantidade),
    precoUnitario: Number(i.preco_unitario),
    valorTotal: Number(i.valor_total),
  }));

  return {
    numero: data.numero,
    status: data.status,
    efetivamenteExpirado: data.status === "ENVIADO" && !!data.validade && data.validade < hojeIsoBrasil(),
    tenantNome: data.tenants?.nome ?? "",
    clienteNome: data.pessoas?.nome ?? "",
    dataEmissao: data.data_emissao,
    validade: data.validade,
    formaPagamentoNome: data.formas_pagamento?.nome ?? null,
    numeroParcelas: data.numero_parcelas,
    observacoes: data.observacoes,
    itens,
    valorTotal: itens.reduce((acc, i) => acc + i.valorTotal, 0),
    motivoRecusa: data.motivo_recusa,
  };
}

// `aprovarOrcamento`/`recusarOrcamento` (orcamentos-comerciais.ts) não sabem
// nada sobre token — recebem tenant_id/orcamento_id resolvidos aqui a partir
// dele, mesma função que o staff usa internamente ao decidir manualmente,
// sem duplicar a regra de negócio.
async function resolverOrcamentoPorToken(token: string): Promise<{ tenantId: string; orcamentoId: string } | { erro: string }> {
  const supabase = createAdminClient();
  const { data: orcamento } = await supabase
    .from("orcamentos_comerciais")
    .select("id, tenant_id, status, validade")
    .eq("token_publico", token)
    .maybeSingle();

  if (!orcamento) return { erro: "Orçamento não encontrado." };
  const expirado = orcamento.status === "ENVIADO" && !!orcamento.validade && orcamento.validade < hojeIsoBrasil();
  if (orcamento.status !== "ENVIADO" || expirado) {
    return { erro: "Esse orçamento já foi resolvido ou não está mais disponível." };
  }
  return { tenantId: orcamento.tenant_id, orcamentoId: orcamento.id };
}

const MENSAGEM_FALHA_GENERICA = "Não foi possível confirmar este orçamento agora — contate o vendedor.";

export async function aprovarOrcamentoPublico(token: string): Promise<{ sucesso: true } | { erro: string }> {
  const resolvido = await resolverOrcamentoPorToken(token);
  if ("erro" in resolvido) return resolvido;

  const supabase = createAdminClient();
  const resultado = await aprovarOrcamento(supabase, { tenantId: resolvido.tenantId, orcamentoId: resolvido.orcamentoId });
  // `gerar_venda_de_orcamento` pode falhar por um motivo interno (ex.: um
  // produto do orçamento perdeu a categoria financeira depois de enviado) —
  // nunca vaza a mensagem SQL crua pra quem não tem sessão.
  if ("erro" in resultado) return { erro: MENSAGEM_FALHA_GENERICA };
  return resultado;
}

export async function recusarOrcamentoPublico(token: string, motivo?: string): Promise<{ sucesso: true } | { erro: string }> {
  const resolvido = await resolverOrcamentoPorToken(token);
  if ("erro" in resolvido) return resolvido;

  const supabase = createAdminClient();
  const resultado = await recusarOrcamento(supabase, { tenantId: resolvido.tenantId, orcamentoId: resolvido.orcamentoId, motivoRecusa: motivo });
  if ("erro" in resultado) return { erro: MENSAGEM_FALHA_GENERICA };
  return resultado;
}
