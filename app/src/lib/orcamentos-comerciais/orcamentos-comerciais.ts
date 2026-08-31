import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { hojeIsoBrasil } from "@/lib/data-brasil";

type Cliente = SupabaseClient<Database>;
type StatusOrcamentoComercial = Database["public"]["Enums"]["status_orcamento_comercial"];
type Resultado = { erro: string } | { sucesso: true };

export type ItemOrcamentoEntrada = { produtoServicoId: string; quantidade: number; precoUnitario: number };

export type ItemOrcamento = {
  id: string;
  produtoServicoId: string;
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
};

export type OrcamentoResumo = {
  id: string;
  numero: number;
  pessoaId: string;
  pessoaNome: string;
  status: StatusOrcamentoComercial;
  dataEmissao: string;
  validade: string | null;
  valorTotal: number;
  criadoEm: string;
};

export type OrcamentoDetalhe = OrcamentoResumo & {
  pessoaEmail: string | null;
  formaPagamentoId: string | null;
  numeroParcelas: number;
  primeiroVencimento: string | null;
  observacoes: string | null;
  tokenPublico: string | null;
  motivoRecusa: string | null;
  vendaGeradaId: string | null;
  itens: ItemOrcamento[];
};

// Validade sugerida no envio: 15 dias corridos a partir de hoje (Brasília).
export function validadeSugerida(): string {
  const data = new Date(hojeIsoBrasil() + "T00:00:00Z");
  data.setUTCDate(data.getUTCDate() + 15);
  return data.toISOString().slice(0, 10);
}

export async function listarOrcamentos(
  supabase: Cliente,
  tenantId: string,
  params?: { status?: StatusOrcamentoComercial; pagina?: number; tamanhoPagina?: number },
): Promise<{ orcamentos: OrcamentoResumo[]; total: number }> {
  const tamanhoPagina = params?.tamanhoPagina ?? 20;
  const pagina = Math.max(1, params?.pagina ?? 1);
  const inicio = (pagina - 1) * tamanhoPagina;

  let query = supabase
    .from("orcamentos_comerciais")
    .select("id, numero, pessoa_id, status, data_emissao, validade, criado_em, pessoas(nome), orcamento_comercial_itens(valor_total)", {
      count: "exact",
    })
    .eq("tenant_id", tenantId)
    .order("numero", { ascending: false })
    .range(inicio, inicio + tamanhoPagina - 1);

  if (params?.status) query = query.eq("status", params.status);

  const { data, count } = await query;

  const orcamentos = (data ?? []).map((o) => ({
    id: o.id,
    numero: o.numero,
    pessoaId: o.pessoa_id,
    pessoaNome: o.pessoas?.nome ?? "",
    status: o.status,
    dataEmissao: o.data_emissao,
    validade: o.validade,
    valorTotal: (o.orcamento_comercial_itens ?? []).reduce((acc, i) => acc + Number(i.valor_total), 0),
    criadoEm: o.criado_em,
  }));

  return { orcamentos, total: count ?? 0 };
}

export async function buscarOrcamento(supabase: Cliente, tenantId: string, orcamentoId: string): Promise<OrcamentoDetalhe | null> {
  const { data } = await supabase
    .from("orcamentos_comerciais")
    .select(
      "id, numero, pessoa_id, status, data_emissao, forma_pagamento_id, numero_parcelas, primeiro_vencimento, observacoes, validade, token_publico, motivo_recusa, venda_gerada_id, criado_em, pessoas(nome, email), orcamento_comercial_itens(id, produto_servico_id, descricao, quantidade, preco_unitario, valor_total)",
    )
    .eq("id", orcamentoId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!data) return null;

  const itens = (data.orcamento_comercial_itens ?? []).map((i) => ({
    id: i.id,
    produtoServicoId: i.produto_servico_id,
    descricao: i.descricao,
    quantidade: Number(i.quantidade),
    precoUnitario: Number(i.preco_unitario),
    valorTotal: Number(i.valor_total),
  }));

  return {
    id: data.id,
    numero: data.numero,
    pessoaId: data.pessoa_id,
    pessoaNome: data.pessoas?.nome ?? "",
    pessoaEmail: data.pessoas?.email ?? null,
    status: data.status,
    dataEmissao: data.data_emissao,
    validade: data.validade,
    valorTotal: itens.reduce((acc, i) => acc + i.valorTotal, 0),
    criadoEm: data.criado_em,
    formaPagamentoId: data.forma_pagamento_id,
    numeroParcelas: data.numero_parcelas,
    primeiroVencimento: data.primeiro_vencimento,
    observacoes: data.observacoes,
    tokenPublico: data.token_publico,
    motivoRecusa: data.motivo_recusa,
    vendaGeradaId: data.venda_gerada_id,
    itens,
  };
}

function validarItens(itens: ItemOrcamentoEntrada[]): string | null {
  if (itens.length === 0) return "Adicione ao menos um item.";
  for (const item of itens) {
    if (!item.produtoServicoId) return "Escolha o produto ou serviço de cada item.";
    if (!Number.isFinite(item.quantidade) || item.quantidade <= 0) return "Quantidade inválida em algum item.";
    if (!Number.isFinite(item.precoUnitario) || item.precoUnitario < 0) return "Preço inválido em algum item.";
  }
  return null;
}

export async function substituirItensOrcamento(
  supabase: Cliente,
  params: { tenantId: string; orcamentoId: string; itens: ItemOrcamentoEntrada[] },
): Promise<string | null> {
  const erroItens = validarItens(params.itens);
  if (erroItens) return erroItens;

  const { error } = await supabase.rpc("substituir_itens_orcamento_comercial", {
    p_tenant_id: params.tenantId,
    p_orcamento_id: params.orcamentoId,
    p_itens: params.itens.map((item) => ({
      produto_servico_id: item.produtoServicoId,
      quantidade: item.quantidade,
      preco_unitario: item.precoUnitario,
    })),
  });

  return error?.message ?? null;
}

export async function criarOrcamento(
  supabase: Cliente,
  params: {
    tenantId: string;
    pessoaId: string;
    dataEmissao: string;
    formaPagamentoId?: string | null;
    numeroParcelas: number;
    primeiroVencimento?: string | null;
    observacoes?: string | null;
    itens: ItemOrcamentoEntrada[];
    criadoPor?: string;
  },
): Promise<{ id: string } | { erro: string }> {
  if (!params.pessoaId) return { erro: "Selecione o cliente." };
  if (!Number.isFinite(params.numeroParcelas) || params.numeroParcelas < 1) return { erro: "Número de parcelas precisa ser pelo menos 1." };
  const erroItens = validarItens(params.itens);
  if (erroItens) return { erro: erroItens };

  const { data: orcamento, error } = await supabase
    .from("orcamentos_comerciais")
    .insert({
      tenant_id: params.tenantId,
      pessoa_id: params.pessoaId,
      data_emissao: params.dataEmissao,
      forma_pagamento_id: params.formaPagamentoId || null,
      numero_parcelas: params.numeroParcelas,
      primeiro_vencimento: params.primeiroVencimento || null,
      observacoes: params.observacoes?.trim() || null,
      criado_por: params.criadoPor,
    })
    .select("id")
    .single();

  if (error || !orcamento) return { erro: error?.message ?? "Falha ao criar o orçamento." };

  const erroItensSalvos = await substituirItensOrcamento(supabase, { tenantId: params.tenantId, orcamentoId: orcamento.id, itens: params.itens });
  if (erroItensSalvos) return { erro: erroItensSalvos };

  return { id: orcamento.id };
}

// Editar um orçamento ENVIADO reseta a validade (quem chama dispara um novo
// e-mail quando `validadeResetada` volta preenchido — mesmo link, proposta
// atualizada).
export async function editarCabecalhoOrcamento(
  supabase: Cliente,
  params: {
    tenantId: string;
    orcamentoId: string;
    pessoaId: string;
    dataEmissao: string;
    formaPagamentoId?: string | null;
    numeroParcelas: number;
    primeiroVencimento?: string | null;
    observacoes?: string | null;
    itens: ItemOrcamentoEntrada[];
  },
): Promise<Resultado & { validadeResetada?: string }> {
  if (!params.pessoaId) return { erro: "Selecione o cliente." };
  if (!Number.isFinite(params.numeroParcelas) || params.numeroParcelas < 1) return { erro: "Número de parcelas precisa ser pelo menos 1." };
  const erroItens = validarItens(params.itens);
  if (erroItens) return { erro: erroItens };

  const { data: atual } = await supabase
    .from("orcamentos_comerciais")
    .select("status")
    .eq("id", params.orcamentoId)
    .eq("tenant_id", params.tenantId)
    .maybeSingle();

  const novaValidade = atual?.status === "ENVIADO" ? validadeSugerida() : undefined;

  const { error } = await supabase
    .from("orcamentos_comerciais")
    .update({
      pessoa_id: params.pessoaId,
      data_emissao: params.dataEmissao,
      forma_pagamento_id: params.formaPagamentoId || null,
      numero_parcelas: params.numeroParcelas,
      primeiro_vencimento: params.primeiroVencimento || null,
      observacoes: params.observacoes?.trim() || null,
      ...(novaValidade ? { validade: novaValidade } : {}),
    })
    .eq("id", params.orcamentoId)
    .eq("tenant_id", params.tenantId);

  if (error) return { erro: error.message };

  const erroItensSalvos = await substituirItensOrcamento(supabase, { tenantId: params.tenantId, orcamentoId: params.orcamentoId, itens: params.itens });
  if (erroItensSalvos) return { erro: erroItensSalvos };

  return { sucesso: true, ...(novaValidade ? { validadeResetada: novaValidade } : {}) };
}

export async function enviarOrcamento(
  supabase: Cliente,
  params: { tenantId: string; orcamentoId: string; validade: string },
): Promise<Resultado> {
  const { data: orcamento } = await supabase
    .from("orcamentos_comerciais")
    .select("pessoas(email)")
    .eq("id", params.orcamentoId)
    .eq("tenant_id", params.tenantId)
    .maybeSingle();

  if (!orcamento?.pessoas?.email) {
    return { erro: "Esse cliente não tem e-mail cadastrado — cadastre um antes de enviar o orçamento." };
  }

  const { data, error } = await supabase
    .from("orcamentos_comerciais")
    .update({ status: "ENVIADO", validade: params.validade, token_publico: crypto.randomUUID() })
    .eq("id", params.orcamentoId)
    .eq("tenant_id", params.tenantId)
    .eq("status", "RASCUNHO")
    .select("id");

  if (error) return { erro: error.message };
  if (!data || data.length === 0) return { erro: "Só é possível enviar um orçamento em rascunho." };
  return { sucesso: true };
}

// Reenvio (só a partir de EXPIRADO) mantém o mesmo token — o link antigo do
// cliente continua válido depois do reenvio.
export async function reenviarOrcamento(
  supabase: Cliente,
  params: { tenantId: string; orcamentoId: string; validade: string },
): Promise<Resultado> {
  const { data, error } = await supabase
    .from("orcamentos_comerciais")
    .update({ status: "ENVIADO", validade: params.validade })
    .eq("id", params.orcamentoId)
    .eq("tenant_id", params.tenantId)
    .eq("status", "EXPIRADO")
    .select("id");

  if (error) return { erro: error.message };
  if (!data || data.length === 0) return { erro: "Só é possível reenviar um orçamento expirado." };
  return { sucesso: true };
}

// Recusa manual pelo staff (cliente respondeu por outro canal) — mesmo
// efeito de quando o cliente clica "Recusar" no link público.
export async function recusarOrcamento(
  supabase: Cliente,
  params: { tenantId: string; orcamentoId: string; motivoRecusa?: string },
): Promise<Resultado> {
  const { data, error } = await supabase
    .from("orcamentos_comerciais")
    .update({ status: "RECUSADO", motivo_recusa: params.motivoRecusa?.trim() || null })
    .eq("id", params.orcamentoId)
    .eq("tenant_id", params.tenantId)
    .eq("status", "ENVIADO")
    .select("id");

  if (error) return { erro: error.message };
  if (!data || data.length === 0) return { erro: "Só é possível recusar um orçamento enviado." };
  return { sucesso: true };
}

// Aprovação manual pelo staff — mesma RPC que o link público usa
// (gerar_venda_de_orcamento), então tem exatamente o mesmo efeito: gera a
// venda e o lançamento na hora.
export async function aprovarOrcamento(
  supabase: Cliente,
  params: { tenantId: string; orcamentoId: string; criadoPor?: string },
): Promise<Resultado> {
  const { data, error } = await supabase.rpc("gerar_venda_de_orcamento", {
    p_tenant_id: params.tenantId,
    p_orcamento_id: params.orcamentoId,
    ...(params.criadoPor ? { p_criado_por: params.criadoPor } : {}),
  });

  if (error || !data) return { erro: error?.message ?? "Falha ao aprovar o orçamento." };
  return { sucesso: true };
}
