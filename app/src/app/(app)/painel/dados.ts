import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { CODIGO_CAIXA_E_BANCOS } from "@/lib/contabil/plano-padrao";
import { buscarResumoVencimentos } from "@/lib/relatorios/aging";
import { buscarMovimento } from "@/lib/relatorios/regime";
import { mesAtual } from "@/lib/relatorios/indicadores-gauge";
import { hojeIsoBrasil } from "@/lib/data-brasil";
import { somarDias } from "@/lib/relatorios/saldo-projetado";

type Cliente = SupabaseClient<Database>;

function isoHoje(): string {
  return hojeIsoBrasil();
}

function isoDaquiA(dias: number): string {
  return somarDias(hojeIsoBrasil(), dias);
}

// A correção anterior (Date.UTC em vez de local + toISOString) resolvia só
// metade do problema: mesmo em UTC puro, `new Date().getUTCMonth()` ainda
// calcula o mês a partir da hora UTC — que nas últimas horas do dia no
// horário de Brasília (21h–23h59) já é o dia/mês seguinte em UTC. A raiz é
// "hoje" ter que vir do fuso de Brasília desde o início (hojeIsoBrasil), não
// só a aritmética de data ser feita em UTC (achado numa auditoria de fuso
// horário mais ampla, ver lib/data-brasil.ts).
function inicioDoMes(offsetMeses = 0): string {
  const [ano, mes] = hojeIsoBrasil().split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1 + offsetMeses, 1)).toISOString().slice(0, 10);
}

// saldo = soma de débitos - soma de créditos na conta contábil "Caixa e
// Bancos" (natureza devedora) — é o próprio ledger de partida dobrada que
// dá a fonte da verdade, não um campo de saldo armazenado em outro lugar.
// Agregado no Postgres (RPC saldo_conta_contabil) em vez de buscar toda
// partida da conta e somar em JS — achado P0 de escalabilidade (25/08):
// crescia sem limite conforme o tenant acumulava histórico, na tela mais
// visitada do sistema.
async function obterSaldoEmCaixa(supabase: Cliente, tenantId: string): Promise<number> {
  const { data: contaCaixa } = await supabase
    .from("contas_contabeis")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("codigo", CODIGO_CAIXA_E_BANCOS)
    .single();

  if (!contaCaixa) return 0;

  const { data: saldo } = await supabase.rpc("saldo_conta_contabil", {
    p_tenant_id: tenantId,
    p_conta_contabil_id: contaCaixa.id,
  });

  return Number(saldo ?? 0);
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
//
// Reaproveita `buscarMovimento` (regime "competência", mesma fonte que os
// links de Receitas/Despesas do mês usam) em vez de somar `valor_total`
// direto de `eventos_financeiros` — a query antiga não excluía parcela
// cancelada nem evento estornado (a view já exclui os dois, ver entradas 47
// e 49 do schema), então o card e o link podiam mostrar números diferentes
// pro "mesmo" mês. Também usa `mesAtual()` (UTC) em vez de `inicioDoMes()`
// (baseada em `new Date()` local), pelo mesmo motivo: os dois precisam do
// exato mesmo recorte de data que o href já usa.
async function obterResultadoDoMes(supabase: Cliente, tenantId: string, pessoaId?: string): Promise<ResultadoDoMes> {
  const { inicio, fim } = mesAtual();
  const movimento = await buscarMovimento(supabase, { tenantId, regime: "competencia", dataInicio: inicio, dataFim: fim });
  const filtrado = pessoaId ? movimento.filter((m) => m.pessoaId === pessoaId) : movimento;

  const resultado: ResultadoDoMes = { liquido: 0, receitas: 0, despesas: 0 };
  for (const m of filtrado) {
    if (m.tipo === "RECEITA") {
      resultado.receitas += m.valor;
      resultado.liquido += m.valor;
    } else {
      resultado.despesas += m.valor;
      resultado.liquido -= m.valor;
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

export type PontoFluxo = { mes: string; chaveIso: string; receitas: number; despesas: number };

// Receita e despesa como duas séries separadas (não só o líquido) —
// padrão visto em toda referência comercial mandada pelo usuário
// (FiraCast, FinEz: duas áreas sobrepostas, uma por fluxo bruto, não uma
// barra de resultado líquido). "resultado" de qualquer ponto = receitas -
// despesas, derivado onde precisar, não guardado solto.
//
// Reaproveita `buscarMovimento` (mesmo motivo de `obterResultadoDoMes`,
// achado na mesma revisão): a query antiga somava `eventos_financeiros.
// valor_total` direto, sem excluir parcela cancelada nem evento estornado —
// confirmado ao vivo que isso inflava o gráfico de Fluxo de caixa (e o
// sparkline de Saldo em caixa, que deriva dele via `reconstruirSerieSaldo`)
// pra a casa dos bilhões num tenant de teste com um evento estornado gigante.
async function obterFluxoUltimosMeses(
  supabase: Cliente,
  tenantId: string,
  quantidadeMeses: number,
  pessoaId?: string,
): Promise<PontoFluxo[]> {
  const dataInicio = inicioDoMes(-(quantidadeMeses - 1));
  const dataFim = mesAtual().fim;
  const movimento = await buscarMovimento(supabase, { tenantId, regime: "competencia", dataInicio, dataFim });
  const filtrado = pessoaId ? movimento.filter((m) => m.pessoaId === pessoaId) : movimento;

  const porMes = new Map<string, { receitas: number; despesas: number }>();
  for (let i = quantidadeMeses - 1; i >= 0; i--) {
    porMes.set(inicioDoMes(-i).slice(0, 7), { receitas: 0, despesas: 0 });
  }

  for (const m of filtrado) {
    const chave = m.data.slice(0, 7);
    const bucket = porMes.get(chave);
    if (!bucket) continue;
    if (m.tipo === "RECEITA") bucket.receitas += m.valor;
    else bucket.despesas += m.valor;
  }

  const nomesMes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return Array.from(porMes.entries()).map(([chave, { receitas, despesas }]) => ({
    mes: nomesMes[Number(chave.slice(5, 7)) - 1],
    chaveIso: chave,
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

// incluirSaldoEmCaixa=false pro portal do cliente: saldo em caixa é uma
// dimensão da empresa inteira (ver comentário em obterSaldoEmCaixa), não dá
// pra recortar por pessoa — mostrar pro cliente do portal seria expor o
// caixa consolidado de todos os outros clientes do mesmo tenant (achado em
// auditoria de segurança, 29/08). A RLS de partidas/contas_contabeis já
// bloqueia esse SELECT pra cliente_portal, então nem vale a pena rodar a
// query: ela só voltaria vazia.
export async function obterDadosPainel(
  supabase: Cliente,
  tenantId: string,
  pessoaId?: string,
  opts?: { incluirSaldoEmCaixa?: boolean },
) {
  const incluirSaldoEmCaixa = opts?.incluirSaldoEmCaixa ?? true;
  const [saldoEmCaixa, aReceber, aPagar, resultadoDoMes, fluxo, eventosRecentes, vencidosReceber, vencidosPagar, recebidoPago, primeirosPassos] = await Promise.all([
    incluirSaldoEmCaixa ? obterSaldoEmCaixa(supabase, tenantId) : Promise.resolve(0),
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
    saldoSerieSeisMeses: incluirSaldoEmCaixa ? reconstruirSerieSaldo(saldoEmCaixa, fluxo) : [],
    resultadoDeltaPercentual: resultadoMesAnterior !== undefined ? deltaPercentual(resultadoDoMes.liquido, resultadoMesAnterior) : undefined,
    primeirosPassos,
  };
}
