import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { criarEventoFinanceiro } from "@/lib/contabil/evento-financeiro";

type Cliente = SupabaseClient<Database>;
type StatusVenda = Database["public"]["Enums"]["status_venda"];
type Resultado = { erro: string } | { sucesso: true };

export type ItemVendaEntrada = { produtoServicoId: string; quantidade: number; precoUnitario: number };

export type ItemVenda = {
  id: string;
  produtoServicoId: string;
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
};

export type VendaResumo = {
  id: string;
  numero: number;
  pessoaId: string;
  pessoaNome: string;
  status: StatusVenda;
  dataEmissao: string;
  valorTotal: number;
  criadoEm: string;
};

export type VendaDetalhe = VendaResumo & {
  formaPagamentoId: string | null;
  numeroParcelas: number;
  primeiroVencimento: string | null;
  observacoes: string | null;
  eventoFinanceiroId: string | null;
  itens: ItemVenda[];
};

export async function listarVendas(supabase: Cliente, tenantId: string, params?: { status?: StatusVenda }): Promise<VendaResumo[]> {
  let query = supabase
    .from("vendas")
    .select("id, numero, pessoa_id, status, data_emissao, criado_em, pessoas(nome), venda_itens(valor_total)")
    .eq("tenant_id", tenantId)
    .order("numero", { ascending: false });

  if (params?.status) query = query.eq("status", params.status);

  const { data } = await query;

  return (data ?? []).map((v) => ({
    id: v.id,
    numero: v.numero,
    pessoaId: v.pessoa_id,
    pessoaNome: v.pessoas?.nome ?? "",
    status: v.status,
    dataEmissao: v.data_emissao,
    valorTotal: (v.venda_itens ?? []).reduce((acc, i) => acc + Number(i.valor_total), 0),
    criadoEm: v.criado_em,
  }));
}

export async function buscarVenda(supabase: Cliente, tenantId: string, vendaId: string): Promise<VendaDetalhe | null> {
  const { data } = await supabase
    .from("vendas")
    .select(
      "id, numero, pessoa_id, status, data_emissao, forma_pagamento_id, numero_parcelas, primeiro_vencimento, observacoes, evento_financeiro_id, criado_em, pessoas(nome), venda_itens(id, produto_servico_id, descricao, quantidade, preco_unitario, valor_total)",
    )
    .eq("id", vendaId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!data) return null;

  const itens = (data.venda_itens ?? []).map((i) => ({
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
    status: data.status,
    dataEmissao: data.data_emissao,
    valorTotal: itens.reduce((acc, i) => acc + i.valorTotal, 0),
    criadoEm: data.criado_em,
    formaPagamentoId: data.forma_pagamento_id,
    numeroParcelas: data.numero_parcelas,
    primeiroVencimento: data.primeiro_vencimento,
    observacoes: data.observacoes,
    eventoFinanceiroId: data.evento_financeiro_id,
    itens,
  };
}

function validarItens(itens: ItemVendaEntrada[]): string | null {
  if (itens.length === 0) return "Adicione ao menos um item.";
  for (const item of itens) {
    if (!item.produtoServicoId) return "Escolha o produto ou serviço de cada item.";
    if (!Number.isFinite(item.quantidade) || item.quantidade <= 0) return "Quantidade inválida em algum item.";
    if (!Number.isFinite(item.precoUnitario) || item.precoUnitario < 0) return "Preço inválido em algum item.";
  }
  return null;
}

// Cria a venda em RASCUNHO com seus itens. `direto: true` já encadeia a
// aprovação na mesma chamada (fluxo de "venda direta" do spec) — sem isso,
// a venda fica parada em RASCUNHO até uma chamada separada de
// enviarOrcamento/aprovarVenda.
export async function criarVenda(
  supabase: Cliente,
  params: {
    tenantId: string;
    pessoaId: string;
    dataEmissao: string;
    formaPagamentoId?: string | null;
    numeroParcelas: number;
    primeiroVencimento?: string | null;
    observacoes?: string | null;
    itens: ItemVendaEntrada[];
    criadoPor?: string;
    direto?: boolean;
  },
): Promise<{ id: string } | { erro: string }> {
  if (!params.pessoaId) return { erro: "Selecione o cliente." };
  const erroItens = validarItens(params.itens);
  if (erroItens) return { erro: erroItens };

  const { data: venda, error } = await supabase
    .from("vendas")
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

  if (error || !venda) return { erro: error?.message ?? "Falha ao criar a venda." };

  const erroItensSalvos = await substituirItensVenda(supabase, { tenantId: params.tenantId, vendaId: venda.id, itens: params.itens });
  if (erroItensSalvos) return { erro: erroItensSalvos };

  if (params.direto) {
    const resultado = await aprovarVenda(supabase, { tenantId: params.tenantId, vendaId: venda.id });
    if ("erro" in resultado) return resultado;
  }

  return { id: venda.id };
}

// Substitui todos os itens de uma venda (apaga e reinsere) — só é chamado
// enquanto a venda está em RASCUNHO/ENVIADO; o trigger trg_travar_itens_venda_terminal
// bloqueia isso depois de APROVADO/RECUSADO como segunda linha de defesa.
export async function substituirItensVenda(
  supabase: Cliente,
  params: { tenantId: string; vendaId: string; itens: ItemVendaEntrada[] },
): Promise<string | null> {
  const erroItens = validarItens(params.itens);
  if (erroItens) return erroItens;

  const { data: produtos } = await supabase
    .from("produtos_servicos")
    .select("id, nome")
    .eq("tenant_id", params.tenantId)
    .in("id", params.itens.map((i) => i.produtoServicoId));

  const nomesPorId = new Map((produtos ?? []).map((p) => [p.id, p.nome]));

  const { error: erroDelete } = await supabase.from("venda_itens").delete().eq("venda_id", params.vendaId);
  if (erroDelete) return erroDelete.message;

  const { error: erroInsert } = await supabase.from("venda_itens").insert(
    params.itens.map((item) => ({
      tenant_id: params.tenantId,
      venda_id: params.vendaId,
      produto_servico_id: item.produtoServicoId,
      descricao: nomesPorId.get(item.produtoServicoId) ?? "",
      quantidade: item.quantidade,
      preco_unitario: item.precoUnitario,
    })),
  );
  if (erroInsert) return erroInsert.message;

  return null;
}

export async function editarCabecalhoVenda(
  supabase: Cliente,
  params: {
    tenantId: string;
    vendaId: string;
    pessoaId: string;
    dataEmissao: string;
    formaPagamentoId?: string | null;
    numeroParcelas: number;
    primeiroVencimento?: string | null;
    observacoes?: string | null;
    itens: ItemVendaEntrada[];
  },
): Promise<Resultado> {
  if (!params.pessoaId) return { erro: "Selecione o cliente." };
  const erroItens = validarItens(params.itens);
  if (erroItens) return { erro: erroItens };

  const { error } = await supabase
    .from("vendas")
    .update({
      pessoa_id: params.pessoaId,
      data_emissao: params.dataEmissao,
      forma_pagamento_id: params.formaPagamentoId || null,
      numero_parcelas: params.numeroParcelas,
      primeiro_vencimento: params.primeiroVencimento || null,
      observacoes: params.observacoes?.trim() || null,
    })
    .eq("id", params.vendaId)
    .eq("tenant_id", params.tenantId);

  if (error) return { erro: error.message };

  const erroItensSalvos = await substituirItensVenda(supabase, { tenantId: params.tenantId, vendaId: params.vendaId, itens: params.itens });
  if (erroItensSalvos) return { erro: erroItensSalvos };

  return { sucesso: true };
}

export async function enviarOrcamento(supabase: Cliente, params: { tenantId: string; vendaId: string }): Promise<Resultado> {
  const { error } = await supabase
    .from("vendas")
    .update({ status: "ENVIADO" })
    .eq("id", params.vendaId)
    .eq("tenant_id", params.tenantId)
    .eq("status", "RASCUNHO");

  if (error) return { erro: error.message };
  return { sucesso: true };
}

export async function recusarVenda(supabase: Cliente, params: { tenantId: string; vendaId: string }): Promise<Resultado> {
  const { error } = await supabase
    .from("vendas")
    .update({ status: "RECUSADO" })
    .eq("id", params.vendaId)
    .eq("tenant_id", params.tenantId)
    .in("status", ["RASCUNHO", "ENVIADO"]);

  if (error) return { erro: error.message };
  return { sucesso: true };
}

// Único gatilho financeiro do módulo: agrega os itens por categoria
// financeira do produto/serviço (soma quem cai na mesma categoria) e chama
// o motor já existente — ganha parcelamento/pessoa/forma de pagamento sem
// nenhum código novo de lançamento. Ver seção "Máquina de estado" do spec.
export async function aprovarVenda(supabase: Cliente, params: { tenantId: string; vendaId: string; criadoPor?: string }): Promise<Resultado> {
  const { data: venda } = await supabase
    .from("vendas")
    .select("id, status, pessoa_id, data_emissao, numero_parcelas, primeiro_vencimento, numero, venda_itens(produto_servico_id, valor_total)")
    .eq("id", params.vendaId)
    .eq("tenant_id", params.tenantId)
    .maybeSingle();

  if (!venda) return { erro: "Venda não encontrada." };
  if (venda.status !== "RASCUNHO" && venda.status !== "ENVIADO") return { erro: "Só é possível aprovar uma venda em rascunho ou enviada." };
  if (!venda.venda_itens || venda.venda_itens.length === 0) return { erro: "Adicione ao menos um item antes de aprovar." };
  if (!venda.primeiro_vencimento) return { erro: "Informe o primeiro vencimento antes de aprovar." };

  const produtoIds = [...new Set(venda.venda_itens.map((i) => i.produto_servico_id))];
  const { data: produtos } = await supabase.from("produtos_servicos").select("id, categoria_financeira_id").in("id", produtoIds);
  const categoriaPorProduto = new Map((produtos ?? []).map((p) => [p.id, p.categoria_financeira_id]));

  const somaPorCategoria = new Map<string, number>();
  for (const item of venda.venda_itens) {
    const categoriaId = categoriaPorProduto.get(item.produto_servico_id);
    if (!categoriaId) return { erro: "Item aponta pra um produto/serviço sem categoria financeira válida." };
    somaPorCategoria.set(categoriaId, (somaPorCategoria.get(categoriaId) ?? 0) + Number(item.valor_total));
  }

  const categorias = [...somaPorCategoria.entries()].map(([categoria_id, valor]) => ({ categoria_id, valor: Math.round(valor * 100) / 100 }));
  const valorTotal = categorias.reduce((acc, c) => acc + c.valor, 0);

  const resultadoEvento = await criarEventoFinanceiro(supabase, {
    tenant_id: params.tenantId,
    tipo: "RECEITA",
    descricao: `Venda #${venda.numero}`,
    valor_total: valorTotal,
    data_competencia: venda.data_emissao,
    categorias,
    pessoa_id: venda.pessoa_id,
    numero_parcelas: venda.numero_parcelas,
    primeiro_vencimento: venda.primeiro_vencimento,
    criado_por: params.criadoPor,
  });

  if ("erro" in resultadoEvento) return resultadoEvento;

  const { error: erroUpdate } = await supabase
    .from("vendas")
    .update({ status: "APROVADO", evento_financeiro_id: resultadoEvento.evento_id })
    .eq("id", params.vendaId)
    .eq("tenant_id", params.tenantId);

  if (erroUpdate) return { erro: erroUpdate.message };
  return { sucesso: true };
}
