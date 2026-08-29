import type { Cliente, MovimentoLinha } from "./regime";
import { buscarMovimento } from "./regime";
import { hojeIsoBrasil } from "@/lib/data-brasil";

export type ProjecaoSaldo = { dias: number; saldo: number; ruptura: boolean };
export type SaldoProjetado = { saldoAtual: number; projecoes: ProjecaoSaldo[]; limiar: number };

const HORIZONTES = [7, 30, 60] as const;

export function somarDias(dataIso: string, dias: number): string {
  const data = new Date(dataIso + "T00:00:00Z");
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

// Só parcelas ainda em aberto contam pra projeção — a mesma trinca de
// status que buscarResumoVencimentos já usa pra "ainda vai acontecer".
// Uma consulta por tipo (não uma só com os dois via join lido em memória)
// segue o mesmo padrão de filtro server-side que o resto de lib/relatorios
// já usa (aging.ts, indicadores-gauge.ts, prazos-medios.ts).
async function buscarParcelasAbertas(supabase: Cliente, tenantId: string, tipo: "RECEITA" | "DESPESA", ateData: string, hojeIso: string) {
  const { data } = await supabase
    .from("parcelas")
    .select("valor, data_vencimento, eventos_financeiros!inner(tipo), baixas(valor_pago, estornado_em)")
    .eq("tenant_id", tenantId)
    .eq("eventos_financeiros.tipo", tipo)
    .in("status", ["PENDENTE", "RECEBIDO_PARCIAL", "ATRASADO"])
    .gt("data_vencimento", hojeIso)
    .lte("data_vencimento", ateData);

  return data ?? [];
}

// Saldo residual, não o valor cheio da parcela — uma RECEBIDO_PARCIAL já
// teve parte do valor recebida (e essa parte já está dentro do saldo atual,
// calculado via regime realizado); somar o valor cheio contaria essa fatia
// duas vezes.
function saldoResidual(parcela: { valor: number; baixas: { valor_pago: number; estornado_em: string | null }[] | null }): number {
  const pago = (parcela.baixas ?? []).filter((b) => !b.estornado_em).reduce((soma, b) => soma + Number(b.valor_pago), 0);
  return Number(parcela.valor) - pago;
}

// Saldo atual + o que ainda está previsto (em aberto) pra vencer em cada
// horizonte, contra o limiar de segurança do tenant — usado tanto pelo card
// de /indicadores quanto pelo cron de alerta (que só olha o D+7).
export async function buscarSaldoProjetado(supabase: Cliente, tenantId: string): Promise<SaldoProjetado> {
  const hojeIso = hojeIsoBrasil();
  const limiteMax = somarDias(hojeIso, Math.max(...HORIZONTES));

  const [contas, tenant, movimentoLiquido, receitasAbertas, despesasAbertas] = await Promise.all([
    supabase.from("contas_financeiras").select("saldo_inicial").eq("tenant_id", tenantId).eq("ativo", true),
    supabase.from("tenants").select("limiar_saldo_minimo_alerta").eq("id", tenantId).single(),
    supabase.rpc("movimento_liquido_realizado", { p_tenant_id: tenantId, p_data_fim: hojeIso }),
    buscarParcelasAbertas(supabase, tenantId, "RECEITA", limiteMax, hojeIso),
    buscarParcelasAbertas(supabase, tenantId, "DESPESA", limiteMax, hojeIso),
  ]);

  // Saldo atual é sempre regime realizado (dinheiro que de fato entrou/saiu
  // via baixa) — nunca previsto/competência, que incluiriam parcela ainda
  // não paga e contariam o mesmo valor de novo na projeção. Movimento
  // líquido agregado no Postgres (RPC movimento_liquido_realizado) — achado
  // P0 de escalabilidade (25/08): buscava todo o histórico desde
  // "1900-01-01" e somava em JS, sem limite conforme o tenant crescia.
  const saldoInicialTotal = (contas.data ?? []).reduce((soma, conta) => soma + Number(conta.saldo_inicial), 0);
  const saldoAtual = saldoInicialTotal + Number(movimentoLiquido.data ?? 0);
  const limiar = Number(tenant.data?.limiar_saldo_minimo_alerta ?? 0);

  const projecoes: ProjecaoSaldo[] = HORIZONTES.map((dias) => {
    const limite = somarDias(hojeIso, dias);
    const receitasPrevistas = receitasAbertas.filter((p) => p.data_vencimento <= limite).reduce((soma, p) => soma + saldoResidual(p), 0);
    const despesasPrevistas = despesasAbertas.filter((p) => p.data_vencimento <= limite).reduce((soma, p) => soma + saldoResidual(p), 0);
    const saldo = saldoAtual + receitasPrevistas - despesasPrevistas;
    return { dias, saldo, ruptura: saldo < limiar };
  });

  return { saldoAtual, projecoes, limiar };
}

export type PontoSerieSaldo = { dias: number; realizado: number | null; projetado: number | null };

const PASSADO_DIAS = [-28, -21, -14, -7, 0] as const;
const FUTURO_DIAS = [0, 10, 20, 30, 40, 50, 60] as const;

function saldoNoDia(movimentos: MovimentoLinha[], saldoAtual: number, hojeIso: string, dias: number): number {
  if (dias >= 0) return saldoAtual;
  const dataLimite = somarDias(hojeIso, dias);
  const somaDepois = movimentos
    .filter((m) => m.data > dataLimite)
    .reduce((soma, m) => soma + (m.tipo === "RECEITA" ? m.valor : -m.valor), 0);
  return saldoAtual - somaDepois;
}

// Série pro gráfico de linha (realizado sólido até hoje + projetado
// tracejado depois) — padrão Mercury/QuickBooks confirmado na pesquisa,
// diferente do card D+7/D+30/D+60 (que continua existindo à parte, é o
// resumo pontual pro alerta por e-mail). "realizado" e "projetado" viram
// duas séries do mesmo gráfico, com o ponto de hoje presente nas duas
// (mesmo valor) pra a linha conectar sem buraco no meio.
export async function buscarSerieSaldoProjetado(supabase: Cliente, tenantId: string): Promise<{ pontos: PontoSerieSaldo[]; limiar: number }> {
  const hojeIso = hojeIsoBrasil();
  const inicioHistorico = somarDias(hojeIso, PASSADO_DIAS[0]);
  const fimProjecao = somarDias(hojeIso, FUTURO_DIAS[FUTURO_DIAS.length - 1]);

  // movimentoHistorico é limitado aos últimos ~28 dias (só o que
  // pontosPassado precisa pra recuar dia a dia) — permanece uma busca
  // normal. saldoAtual usa a mesma RPC agregada de buscarSaldoProjetado,
  // não um segundo fetch de todo o histórico (mesmo achado P0 de
  // escalabilidade, 25/08).
  const [contas, tenant, movimentoHistorico, movimentoLiquido, receitasAbertas, despesasAbertas] = await Promise.all([
    supabase.from("contas_financeiras").select("saldo_inicial").eq("tenant_id", tenantId).eq("ativo", true),
    supabase.from("tenants").select("limiar_saldo_minimo_alerta").eq("id", tenantId).single(),
    buscarMovimento(supabase, { tenantId, regime: "realizado", dataInicio: inicioHistorico, dataFim: hojeIso }),
    supabase.rpc("movimento_liquido_realizado", { p_tenant_id: tenantId, p_data_fim: hojeIso }),
    buscarParcelasAbertas(supabase, tenantId, "RECEITA", fimProjecao, hojeIso),
    buscarParcelasAbertas(supabase, tenantId, "DESPESA", fimProjecao, hojeIso),
  ]);

  const saldoInicialTotal = (contas.data ?? []).reduce((soma, conta) => soma + Number(conta.saldo_inicial), 0);
  const saldoAtual = saldoInicialTotal + Number(movimentoLiquido.data ?? 0);
  const limiar = Number(tenant.data?.limiar_saldo_minimo_alerta ?? 0);

  // Hoje (dias=0) é um único ponto com realizado E projetado preenchidos —
  // é o que faz as duas linhas se encontrarem no mesmo lugar em vez de
  // deixar um buraco entre "onde o sólido para" e "onde o tracejado começa".
  const pontosPassado: PontoSerieSaldo[] = PASSADO_DIAS.filter((d) => d !== 0).map((dias) => ({
    dias,
    realizado: saldoNoDia(movimentoHistorico, saldoAtual, hojeIso, dias),
    projetado: null,
  }));

  const pontosFuturo: PontoSerieSaldo[] = FUTURO_DIAS.filter((d) => d !== 0).map((dias) => {
    const limite = somarDias(hojeIso, dias);
    const receitasPrevistas = receitasAbertas.filter((p) => p.data_vencimento <= limite).reduce((soma, p) => soma + saldoResidual(p), 0);
    const despesasPrevistas = despesasAbertas.filter((p) => p.data_vencimento <= limite).reduce((soma, p) => soma + saldoResidual(p), 0);
    return { dias, realizado: null, projetado: saldoAtual + receitasPrevistas - despesasPrevistas };
  });

  const pontoHoje: PontoSerieSaldo = { dias: 0, realizado: saldoAtual, projetado: saldoAtual };

  return { pontos: [...pontosPassado, pontoHoje, ...pontosFuturo], limiar };
}
