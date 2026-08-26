// Busca por trás da tela /lancamentos — destino de todo clique em gráfico
// (ver spec e plano 2026-08-25-drill-down-graficos). Cada dimensão usa a
// mesma fonte de verdade que a função de relatório que alimentou o gráfico
// de origem, pra garantir que o total daqui bate exato com o valor da
// fatia clicada: forma de pagamento soma baixas.valor_pago (não
// evento.valor_total — mesmo raciocínio de distribuicao-forma-pagamento.ts),
// categoria/centro de custo somam o rateio (não o evento inteiro, que pode
// estar dividido entre categorias) — só pessoa usa valor_total do evento
// direto, porque pessoa é campo único do evento, sem divisão possível.
import type { Cliente } from "./regime";

export type LinhaLancamentoFiltrado = {
  id: string;
  descricao: string | null;
  valor_total: number;
  tipo: "RECEITA" | "DESPESA";
  parcelas: { status: string; data_vencimento: string }[];
  rateio_categoria: { categorias_financeiras: { nome: string } | null }[];
};

// "nenhuma" = bucket "Não informado"/"Sem pessoa" (id nulo na origem);
// array com mais de 1 item = fatia "Outras" (vários ids agregados).
type ValorFiltro = string[] | "nenhuma";

export type FiltroLancamentos =
  | { dimensao: "categoria"; valor: ValorFiltro }
  | { dimensao: "forma_pagamento"; valor: ValorFiltro }
  | { dimensao: "centro_custo"; valor: ValorFiltro }
  | { dimensao: "pessoa"; valor: ValorFiltro };

export type ResultadoLancamentosFiltrados = {
  linhas: LinhaLancamentoFiltrado[];
  total: number;
  quantidade: number;
  rotulo: string;
};

const SELECT_EVENTO = "id, descricao, valor_total, tipo, parcelas(status, data_vencimento), rateio_categoria(categorias_financeiras(nome))";
const VAZIO = (rotulo: string): ResultadoLancamentosFiltrados => ({ linhas: [], total: 0, quantidade: 0, rotulo });

export async function buscarLancamentosFiltrados(
  supabase: Cliente,
  params: { tenantId: string; filtro: FiltroLancamentos; periodoInicio: string; periodoFim: string },
): Promise<ResultadoLancamentosFiltrados> {
  switch (params.filtro.dimensao) {
    case "forma_pagamento":
      return buscarPorFormaPagamento(supabase, params.tenantId, params.filtro.valor, params.periodoInicio, params.periodoFim);
    case "categoria":
      return buscarPorCategoria(supabase, params.tenantId, params.filtro.valor, params.periodoInicio, params.periodoFim);
    case "centro_custo":
      return buscarPorCentroCusto(supabase, params.tenantId, params.filtro.valor, params.periodoInicio, params.periodoFim);
    case "pessoa":
      return buscarPorPessoa(supabase, params.tenantId, params.filtro.valor, params.periodoInicio, params.periodoFim);
  }
}

async function buscarEventosPorId(supabase: Cliente, tenantId: string, eventoIds: string[]): Promise<LinhaLancamentoFiltrado[]> {
  if (eventoIds.length === 0) return [];
  const { data } = await supabase.from("eventos_financeiros").select(SELECT_EVENTO).eq("tenant_id", tenantId).in("id", eventoIds);
  return data ?? [];
}

async function buscarPorFormaPagamento(
  supabase: Cliente,
  tenantId: string,
  valor: ValorFiltro,
  periodoInicio: string,
  periodoFim: string,
): Promise<ResultadoLancamentosFiltrados> {
  let query = supabase
    .from("baixas")
    .select("valor_pago, forma_pagamento_id, formas_pagamento(nome), parcelas!inner(evento_financeiro_id)")
    .eq("tenant_id", tenantId)
    .is("estornado_em", null)
    .gte("data_pagamento", periodoInicio)
    .lte("data_pagamento", periodoFim);
  query = valor === "nenhuma" ? query.is("forma_pagamento_id", null) : query.in("forma_pagamento_id", valor);

  const { data } = await query;
  const baixas = data ?? [];
  if (baixas.length === 0) return VAZIO(valor === "nenhuma" ? "Não informado" : "-");

  const total = baixas.reduce((soma, b) => soma + Number(b.valor_pago), 0);
  const eventoIds = [...new Set(baixas.map((b) => b.parcelas!.evento_financeiro_id))];
  // valor.length checado ANTES de olhar o nome — uma "Outras" com 2+ ids
  // não pode virar o nome da primeira baixa só porque ela por acaso tem
  // nome (achado ao vivo: "Cartão" sozinho representando Cartão + Cartão de
  // Crédito juntos, escondendo que é um agregado).
  const rotulo = valor === "nenhuma" ? "Não informado" : valor.length > 1 ? "Várias formas de pagamento" : (baixas[0].formas_pagamento?.nome ?? "-");

  return { linhas: await buscarEventosPorId(supabase, tenantId, eventoIds), total, quantidade: baixas.length, rotulo };
}

async function buscarPorCategoria(
  supabase: Cliente,
  tenantId: string,
  valor: ValorFiltro,
  periodoInicio: string,
  periodoFim: string,
): Promise<ResultadoLancamentosFiltrados> {
  let query = supabase
    .from("rateio_categoria")
    .select("valor, evento_financeiro_id, categoria_id, categorias_financeiras(nome), eventos_financeiros!inner(data_competencia, estornado_em)")
    .eq("tenant_id", tenantId)
    .is("eventos_financeiros.estornado_em", null)
    .gte("eventos_financeiros.data_competencia", periodoInicio)
    .lte("eventos_financeiros.data_competencia", periodoFim);
  query = valor === "nenhuma" ? query.is("categoria_id", null) : query.in("categoria_id", valor);

  const { data } = await query;
  const rateios = data ?? [];
  if (rateios.length === 0) return VAZIO(valor === "nenhuma" ? "Sem categoria" : "-");

  const total = rateios.reduce((soma, r) => soma + Number(r.valor), 0);
  const eventoIds = [...new Set(rateios.map((r) => r.evento_financeiro_id))];
  const rotulo = valor === "nenhuma" ? "Sem categoria" : valor.length > 1 ? "Outras categorias" : (rateios[0].categorias_financeiras?.nome ?? "-");

  return { linhas: await buscarEventosPorId(supabase, tenantId, eventoIds), total, quantidade: eventoIds.length, rotulo };
}

// Sem chart nenhum desta leva usando esse bucket ainda (Centro de Custo
// entra na 2ª leva) — "nenhuma" fica com implementação mínima de propósito,
// não vale a query de exclusão (rateio sem rateio_centro_custo) por algo
// que nenhum clique real vai disparar por ora.
async function buscarPorCentroCusto(
  supabase: Cliente,
  tenantId: string,
  valor: ValorFiltro,
  periodoInicio: string,
  periodoFim: string,
): Promise<ResultadoLancamentosFiltrados> {
  if (valor === "nenhuma") return VAZIO("Sem centro de custo");

  const { data: eventosNoPeriodo } = await supabase
    .from("eventos_financeiros")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("estornado_em", null)
    .gte("data_competencia", periodoInicio)
    .lte("data_competencia", periodoFim);
  const idsNoPeriodo = (eventosNoPeriodo ?? []).map((e) => e.id);
  if (idsNoPeriodo.length === 0) return VAZIO("-");

  const { data } = await supabase
    .from("rateio_centro_custo")
    .select("valor, centro_custo_id, centros_custo(nome), rateio_categoria!inner(evento_financeiro_id)")
    .eq("tenant_id", tenantId)
    .in("centro_custo_id", valor)
    .in("rateio_categoria.evento_financeiro_id", idsNoPeriodo);

  const rateios = data ?? [];
  if (rateios.length === 0) return VAZIO("-");

  const total = rateios.reduce((soma, r) => soma + Number(r.valor), 0);
  const eventoIds = [...new Set(rateios.map((r) => r.rateio_categoria!.evento_financeiro_id))];
  const rotulo = valor.length > 1 ? "Outros centros de custo" : (rateios[0].centros_custo?.nome ?? "-");

  return { linhas: await buscarEventosPorId(supabase, tenantId, eventoIds), total, quantidade: eventoIds.length, rotulo };
}

// Só chega aqui com lista (fatia "Outras") ou null ("Sem pessoa") — uma
// clicar numa única pessoa nomeada também cai aqui (não no extrato dela —
// achado ao vivo: quem clica num gráfico quer ver os lançamentos, não a
// tela de cadastro), então "um id só" também é um caso real, não só
// lista/null.
async function buscarPorPessoa(
  supabase: Cliente,
  tenantId: string,
  valor: ValorFiltro,
  periodoInicio: string,
  periodoFim: string,
): Promise<ResultadoLancamentosFiltrados> {
  let query = supabase
    .from("eventos_financeiros")
    .select(SELECT_EVENTO)
    .eq("tenant_id", tenantId)
    .is("estornado_em", null)
    .gte("data_competencia", periodoInicio)
    .lte("data_competencia", periodoFim);
  query = valor === "nenhuma" ? query.is("pessoa_id", null) : query.in("pessoa_id", valor);

  const { data } = await query;
  const linhas = data ?? [];
  const total = linhas.reduce((soma, e) => soma + Number(e.valor_total), 0);

  let rotulo: string;
  if (valor === "nenhuma") {
    rotulo = "Sem pessoa vinculada";
  } else if (valor.length === 1) {
    const { data: pessoa } = await supabase.from("pessoas").select("nome").eq("id", valor[0]).eq("tenant_id", tenantId).maybeSingle();
    rotulo = pessoa?.nome ?? "-";
  } else {
    rotulo = "Outras pessoas";
  }

  return { linhas, total, quantidade: linhas.length, rotulo };
}
