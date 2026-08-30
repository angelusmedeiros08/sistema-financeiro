import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";

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

// Paginação real no servidor (achado em auditoria de escalabilidade,
// 30/08/2026) — antes buscava todo o histórico de vendas do tenant sem
// `.range()` nem teto de período, mesma classe de exposição já corrigida em
// Despesas/Receitas e na Central de Importações.
export async function listarVendas(
  supabase: Cliente,
  tenantId: string,
  params?: { status?: StatusVenda; pagina?: number; tamanhoPagina?: number },
): Promise<{ vendas: VendaResumo[]; total: number }> {
  const tamanhoPagina = params?.tamanhoPagina ?? 20;
  const pagina = Math.max(1, params?.pagina ?? 1);
  const inicio = (pagina - 1) * tamanhoPagina;

  let query = supabase
    .from("vendas")
    .select("id, numero, pessoa_id, status, data_emissao, criado_em, pessoas(nome), venda_itens(valor_total)", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("numero", { ascending: false })
    .range(inicio, inicio + tamanhoPagina - 1);

  if (params?.status) query = query.eq("status", params.status);

  const { data, count } = await query;

  const vendas = (data ?? []).map((v) => ({
    id: v.id,
    numero: v.numero,
    pessoaId: v.pessoa_id,
    pessoaNome: v.pessoas?.nome ?? "",
    status: v.status,
    dataEmissao: v.data_emissao,
    valorTotal: (v.venda_itens ?? []).reduce((acc, i) => acc + Number(i.valor_total), 0),
    criadoEm: v.criado_em,
  }));

  return { vendas, total: count ?? 0 };
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
//
// DELETE + INSERT rodam dentro da RPC `substituir_itens_venda`, na mesma
// transação — antes eram duas chamadas PostgREST separadas: se o INSERT
// falhasse (produto_servico_id inválido/excluído entre a página carregar
// e o submit, violando FK), o DELETE já tinha sido efetivado e a venda
// ficava com zero itens persistidos (achado em revisão de código).
export async function substituirItensVenda(
  supabase: Cliente,
  params: { tenantId: string; vendaId: string; itens: ItemVendaEntrada[] },
): Promise<string | null> {
  const erroItens = validarItens(params.itens);
  if (erroItens) return erroItens;

  const { error } = await supabase.rpc("substituir_itens_venda", {
    p_tenant_id: params.tenantId,
    p_venda_id: params.vendaId,
    p_itens: params.itens.map((item) => ({
      produto_servico_id: item.produtoServicoId,
      quantidade: item.quantidade,
      preco_unitario: item.precoUnitario,
    })),
  });

  return error?.message ?? null;
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

export async function recusarVenda(supabase: Cliente, params: { tenantId: string; vendaId: string }): Promise<Resultado> {
  const { data, error } = await supabase
    .from("vendas")
    .update({ status: "RECUSADO" })
    .eq("id", params.vendaId)
    .eq("tenant_id", params.tenantId)
    .eq("status", "RASCUNHO")
    .select("id");

  if (error) return { erro: error.message };
  if (!data || data.length === 0) return { erro: "Só é possível recusar uma venda em rascunho." };
  return { sucesso: true };
}

// Agrega os itens por categoria financeira do produto/serviço (soma quem
// cai na mesma categoria) e cria o evento financeiro — ganha parcelamento/
// pessoa/forma de pagamento sem nenhum código novo de lançamento. Ver
// seção "Máquina de estado" do spec.
//
// Roda inteiro dentro da RPC `aprovar_venda`, numa única transação, que
// trava a linha da venda (FOR UPDATE) antes de checar o status — antes,
// o evento financeiro era criado ANTES do UPDATE que marca APROVADO, e
// esse UPDATE não tinha guarda de status: duplo clique/duas abas passavam
// ambas pela checagem antes de qualquer uma gravar APROVADO, cada uma
// criando seu próprio evento e duplicando a receita da mesma venda
// (achado em revisão de código). Com o lock no banco, a segunda chamada
// concorrente bloqueia até a primeira terminar e então é corretamente
// rejeitada (status já não é mais RASCUNHO/ENVIADO).
export async function aprovarVenda(supabase: Cliente, params: { tenantId: string; vendaId: string; criadoPor?: string }): Promise<Resultado> {
  const { data, error } = await supabase.rpc("aprovar_venda", {
    p_tenant_id: params.tenantId,
    p_venda_id: params.vendaId,
    ...(params.criadoPor ? { p_criado_por: params.criadoPor } : {}),
  });

  if (error || !data) return { erro: error?.message ?? "Falha ao aprovar a venda." };
  return { sucesso: true };
}
