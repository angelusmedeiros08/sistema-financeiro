import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";
import { hojeIsoBrasil } from "@/lib/data-brasil";
import { aprovarVenda, recusarVenda } from "./vendas";
import type { Database } from "@/utils/supabase/database.types";

type StatusVenda = Database["public"]["Enums"]["status_venda"];

export type ItemOrcamentoPublico = {
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
};

export type OrcamentoPublico = {
  numero: number;
  status: StatusVenda;
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
// `vendas`/`venda_itens` pra `anon`, o token já é a autorização, verificado
// aqui, e só os campos necessários pra exibir a proposta voltam pra fora.
export async function buscarOrcamentoPorToken(token: string): Promise<OrcamentoPublico | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("vendas")
    .select(
      "numero, status, data_emissao, validade, numero_parcelas, observacoes, motivo_recusa, pessoas(nome), tenants(nome), formas_pagamento(nome), venda_itens(descricao, quantidade, preco_unitario, valor_total)",
    )
    .eq("token_publico", token)
    .maybeSingle();

  if (!data) return null;

  const itens = (data.venda_itens ?? []).map((i) => ({
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

// `aprovarVenda`/`recusarVenda` (lib/vendas/vendas.ts) não sabem nada sobre
// token — recebem tenant_id/venda_id resolvidos aqui a partir dele, mesma
// função que o staff usa internamente, sem duplicar a regra de negócio
// (checagem de item sem categoria, trava de reentrância, etc. já vivem lá).
async function resolverVendaPorToken(
  token: string,
): Promise<{ tenantId: string; vendaId: string } | { erro: string }> {
  const supabase = createAdminClient();
  const { data: venda } = await supabase
    .from("vendas")
    .select("id, tenant_id, status, validade")
    .eq("token_publico", token)
    .maybeSingle();

  if (!venda) return { erro: "Orçamento não encontrado." };
  const expirado = venda.status === "ENVIADO" && !!venda.validade && venda.validade < hojeIsoBrasil();
  if (venda.status !== "ENVIADO" || expirado) {
    return { erro: "Esse orçamento já foi resolvido ou não está mais disponível." };
  }
  return { tenantId: venda.tenant_id, vendaId: venda.id };
}

export async function aprovarOrcamentoPublico(token: string): Promise<{ sucesso: true } | { erro: string }> {
  const resolvido = await resolverVendaPorToken(token);
  if ("erro" in resolvido) return resolvido;

  const supabase = createAdminClient();
  return aprovarVenda(supabase, { tenantId: resolvido.tenantId, vendaId: resolvido.vendaId });
}

export async function recusarOrcamentoPublico(token: string, motivo?: string): Promise<{ sucesso: true } | { erro: string }> {
  const resolvido = await resolverVendaPorToken(token);
  if ("erro" in resolvido) return resolvido;

  const supabase = createAdminClient();
  return recusarVenda(supabase, { tenantId: resolvido.tenantId, vendaId: resolvido.vendaId, motivoRecusa: motivo });
}
