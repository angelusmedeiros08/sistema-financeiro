import type { Cliente } from "./regime";
import { buscarMovimento } from "./regime";

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
  const hojeIso = new Date().toISOString().slice(0, 10);
  const limiteMax = somarDias(hojeIso, Math.max(...HORIZONTES));

  const [contas, tenant, movimentoRealizado, receitasAbertas, despesasAbertas] = await Promise.all([
    supabase.from("contas_financeiras").select("saldo_inicial").eq("tenant_id", tenantId).eq("ativo", true),
    supabase.from("tenants").select("limiar_saldo_minimo_alerta").eq("id", tenantId).single(),
    buscarMovimento(supabase, { tenantId, regime: "realizado", dataInicio: "1900-01-01", dataFim: hojeIso }),
    buscarParcelasAbertas(supabase, tenantId, "RECEITA", limiteMax, hojeIso),
    buscarParcelasAbertas(supabase, tenantId, "DESPESA", limiteMax, hojeIso),
  ]);

  // Saldo atual é sempre regime realizado (dinheiro que de fato entrou/saiu
  // via baixa) — nunca previsto/competência, que incluiriam parcela ainda
  // não paga e contariam o mesmo valor de novo na projeção.
  const saldoInicialTotal = (contas.data ?? []).reduce((soma, conta) => soma + Number(conta.saldo_inicial), 0);
  const movimentoLiquido = movimentoRealizado.reduce((soma, linha) => soma + (linha.tipo === "RECEITA" ? linha.valor : -linha.valor), 0);
  const saldoAtual = saldoInicialTotal + movimentoLiquido;
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
