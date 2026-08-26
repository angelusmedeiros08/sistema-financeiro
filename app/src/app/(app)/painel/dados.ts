import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { CODIGO_CAIXA_E_BANCOS } from "@/lib/contabil/plano-padrao";
import { buscarResumoVencimentos } from "@/lib/relatorios/aging";
import { buscarMovimento } from "@/lib/relatorios/regime";
import { mesAtual } from "@/lib/relatorios/indicadores-gauge";

type Cliente = SupabaseClient<Database>;

function isoHoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDaquiA(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

function inicioDoMes(offsetMeses = 0): string {
  const data = new Date();
  data.setDate(1);
  data.setMonth(data.getMonth() + offsetMeses);
  return data.toISOString().slice(0, 10);
}

// saldo = soma de débitos - soma de créditos na conta contábil "Caixa e
// Bancos" (natureza devedora) — é o próprio ledger de partida dobrada que
// dá a fonte da verdade, não um campo de saldo armazenado em outro lugar.
async function obterSaldoEmCaixa(supabase: Cliente, tenantId: string): Promise<number> {
  const { data: contaCaixa } = await supabase
    .from("contas_contabeis")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("codigo", CODIGO_CAIXA_E_BANCOS)
    .single();

  if (!contaCaixa) return 0;

  const { data: partidas } = await supabase
    .from("partidas")
    .select("tipo, valor")
    .eq("tenant_id", tenantId)
    .eq("conta_contabil_id", contaCaixa.id);

  if (!partidas) return 0;

  return partidas.reduce(
    (acc, p) => acc + (p.tipo === "DEBITO" ? Number(p.valor) : -Number(p.valor)),
    0,
  );
}

async function obterPendentesPorTipo(
  supabase: Cliente,
  tenantId: string,
  tipo: "RECEITA" | "DESPESA",
  pessoaId?: string,
): Promise<{ total: number; quantidade: number }> {
  let query = supabase
    .from("parcelas")
    .select("valor, eventos_financeiros!inner(tipo, pessoa_id)")
    .eq("tenant_id", tenantId)
    .eq("status", "PENDENTE")
    .eq("eventos_financeiros.tipo", tipo)
    .gte("data_vencimento", isoHoje())
    .lte("data_vencimento", isoDaquiA(30));

  if (pessoaId) query = query.eq("eventos_financeiros.pessoa_id", pessoaId);

  const { data } = await query;

  if (!data) return { total: 0, quantidade: 0 };

  return {
    total: data.reduce((acc, p) => acc + Number(p.valor), 0),
    quantidade: data.length,
  };
}

export type ResultadoDoMes = { liquido: number; receitas: number; despesas: number };

// Receitas/despesas separadas (não só o líquido) — Resultado do mês ganhou 2
// linhas linkáveis pro Painel clicável (ver spec 2026-08-26-painel-clicavel);
// o líquido em si continua sem link (é subtração, não soma direta de
// lançamentos — mesmo precedente de "Saldo" em Centro de Custo).
async function obterResultadoDoMes(supabase: Cliente, tenantId: string, pessoaId?: string): Promise<ResultadoDoMes> {
  let query = supabase
    .from("eventos_financeiros")
    .select("tipo, valor_total")
    .eq("tenant_id", tenantId)
    .gte("data_competencia", inicioDoMes())
    .lt("data_competencia", inicioDoMes(1));

  if (pessoaId) query = query.eq("pessoa_id", pessoaId);

  const { data } = await query;

  const resultado: ResultadoDoMes = { liquido: 0, receitas: 0, despesas: 0 };
  for (const e of data ?? []) {
    const valor = Number(e.valor_total);
    if (e.tipo === "RECEITA") {
      resultado.receitas += valor;
      resultado.liquido += valor;
    } else {
      resultado.despesas += valor;
      resultado.liquido -= valor;
    }
  }
  return resultado;
}

// Quanto já virou caixa de fato este mês — reaproveita o mesmo mecanismo de
// regime "realizado" (data_pagamento, via vw_movimento_realizado) que Fluxo
// de Caixa e DFC já usam, em vez de reabrir parcelas/baixas na mão.
async function obterRecebidoPagoDoMes(supabase: Cliente, tenantId: string, pessoaId?: string): Promise<{ recebido: number; pago: number }> {
  const { inicio, fim } = mesAtual();
  const movimento = await buscarMovimento(supabase, { tenantId, regime: "realizado", dataInicio: inicio, dataFim: fim });
  const filtrado = pessoaId ? movimento.filter((m) => m.pessoaId === pessoaId) : movimento;

  return filtrado.reduce(
    (acc, m) => {
      if (m.tipo === "RECEITA") acc.recebido += m.valor;
      else acc.pago += m.valor;
      return acc;
    },
    { recebido: 0, pago: 0 },
  );
}

export type PontoFluxo = { mes: string; receitas: number; despesas: number };

// Receita e despesa como duas séries separadas (não só o líquido) —
// padrão visto em toda referência comercial mandada pelo usuário
// (FiraCast, FinEz: duas áreas sobrepostas, uma por fluxo bruto, não uma
// barra de resultado líquido). "resultado" de qualquer ponto = receitas -
// despesas, derivado onde precisar, não guardado solto.
async function obterFluxoUltimosMeses(
  supabase: Cliente,
  tenantId: string,
  quantidadeMeses: number,
  pessoaId?: string,
): Promise<PontoFluxo[]> {
  let query = supabase
    .from("eventos_financeiros")
    .select("tipo, valor_total, data_competencia")
    .eq("tenant_id", tenantId)
    .gte("data_competencia", inicioDoMes(-(quantidadeMeses - 1)));

  if (pessoaId) query = query.eq("pessoa_id", pessoaId);

  const { data } = await query;

  const porMes = new Map<string, { receitas: number; despesas: number }>();
  for (let i = quantidadeMeses - 1; i >= 0; i--) {
    porMes.set(inicioDoMes(-i).slice(0, 7), { receitas: 0, despesas: 0 });
  }

  for (const evento of data ?? []) {
    const chave = evento.data_competencia.slice(0, 7);
    const bucket = porMes.get(chave);
    if (!bucket) continue;
    if (evento.tipo === "RECEITA") bucket.receitas += Number(evento.valor_total);
    else bucket.despesas += Number(evento.valor_total);
  }

  const nomesMes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return Array.from(porMes.entries()).map(([chave, { receitas, despesas }]) => ({
    mes: nomesMes[Number(chave.slice(5, 7)) - 1],
    receitas,
    despesas,
  }));
}

export type EventoRecente = {
  id: string;
  descricao: string | null;
  tipo: "RECEITA" | "DESPESA";
  valor_total: number;
  status: string | null;
  dataCompetencia: string;
};

async function obterEventosRecentes(supabase: Cliente, tenantId: string, pessoaId?: string): Promise<EventoRecente[]> {
  let query = supabase
    .from("eventos_financeiros")
    .select("id, descricao, tipo, valor_total, data_competencia, parcelas(status)")
    .eq("tenant_id", tenantId)
    .order("data_competencia", { ascending: false })
    .limit(5);

  if (pessoaId) query = query.eq("pessoa_id", pessoaId);

  const { data } = await query;

  return (data ?? []).map((e) => ({
    id: e.id,
    descricao: e.descricao,
    tipo: e.tipo,
    valor_total: Number(e.valor_total),
    status: e.parcelas?.[0]?.status ?? null,
    dataCompetencia: e.data_competencia,
  }));
}

// pessoaId filtra tudo que passa por eventos_financeiros/parcelas — usado
// pelo portal do cliente pra mostrar só os próprios lançamentos. Saldo em
// caixa fica de fora do filtro de propósito: é uma dimensão do caixa da
// empresa inteira, não tem "saldo em caixa de uma pessoa".
// Reconstrói o saldo em caixa ao final de cada mês passado a partir do saldo
// atual: saldo(mês i) = saldo atual - soma dos resultados dos meses depois
// de i. Não é estimativa — é o mesmo número que o ledger daria se fosse
// consultado naquela data, só que sem reabrir partidas mês a mês.
function reconstruirSerieSaldo(saldoAtual: number, fluxo: PontoFluxo[]): number[] {
  const serie: number[] = [];
  let acumulado = saldoAtual;
  for (let i = fluxo.length - 1; i >= 0; i--) {
    serie.unshift(acumulado);
    acumulado -= fluxo[i].receitas - fluxo[i].despesas;
  }
  return serie;
}

function deltaPercentual(atual: number, anterior: number): number | undefined {
  if (anterior === 0) return undefined;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export type PrimeirosPassos = {
  contaFinanceira: boolean;
  cliente: boolean;
  lancamento: boolean;
};

async function obterPrimeirosPassos(supabase: Cliente, tenantId: string): Promise<PrimeirosPassos> {
  const [contas, clientes, lancamentos] = await Promise.all([
    supabase.from("contas_financeiras").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("pessoas").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).contains("perfis", ["CLIENTE"]),
    supabase.from("eventos_financeiros").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
  ]);

  return {
    contaFinanceira: (contas.count ?? 0) > 0,
    cliente: (clientes.count ?? 0) > 0,
    lancamento: (lancamentos.count ?? 0) > 0,
  };
}

export async function obterDadosPainel(supabase: Cliente, tenantId: string, pessoaId?: string) {
  const [saldoEmCaixa, aReceber, aPagar, resultadoDoMes, fluxo, eventosRecentes, vencidosReceber, vencidosPagar, recebidoPago, primeirosPassos] = await Promise.all([
    obterSaldoEmCaixa(supabase, tenantId),
    obterPendentesPorTipo(supabase, tenantId, "RECEITA", pessoaId),
    obterPendentesPorTipo(supabase, tenantId, "DESPESA", pessoaId),
    obterResultadoDoMes(supabase, tenantId, pessoaId),
    obterFluxoUltimosMeses(supabase, tenantId, 6, pessoaId),
    obterEventosRecentes(supabase, tenantId, pessoaId),
    buscarResumoVencimentos(supabase, { tenantId, tipo: "RECEITA", pessoaId }),
    buscarResumoVencimentos(supabase, { tenantId, tipo: "DESPESA", pessoaId }),
    obterRecebidoPagoDoMes(supabase, tenantId, pessoaId),
    obterPrimeirosPassos(supabase, tenantId),
  ]);

  const penultimoPonto = fluxo.length >= 2 ? fluxo[fluxo.length - 2] : undefined;
  const resultadoMesAnterior = penultimoPonto ? penultimoPonto.receitas - penultimoPonto.despesas : undefined;

  return {
    saldoEmCaixa,
    aReceber,
    aPagar,
    resultadoDoMes,
    fluxo,
    eventosRecentes,
    vencidosReceber,
    vencidosPagar,
    recebidoDoMes: recebidoPago.recebido,
    pagoDoMes: recebidoPago.pago,
    saldoSerieSeisMeses: reconstruirSerieSaldo(saldoEmCaixa, fluxo),
    resultadoDeltaPercentual: resultadoMesAnterior !== undefined ? deltaPercentual(resultadoDoMes.liquido, resultadoMesAnterior) : undefined,
    primeirosPassos,
  };
}
