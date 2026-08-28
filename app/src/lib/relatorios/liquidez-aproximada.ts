// Liquidez aproximada — 6ª seção da Central de Indicadores (ver spec e
// plano 2026-08-26-liquidez-ciclo-caixa). Caixa atual + a receber em até 30
// dias ÷ a pagar em até 30 dias, ambos incluindo o que já venceu — não é
// "vence nos próximos 30 dias", é "pressiona o caixa até lá".
import type { Cliente } from "./regime";
import { buscarSaldoProjetado, somarDias } from "./saldo-projetado";
import { STATUS_VENCIDO } from "./aging";
import { hojeIsoBrasil } from "@/lib/data-brasil";

export type NivelLiquidez = "RISCO" | "ATENCAO" | "SAUDAVEL";

export type LiquidezAproximada = {
  // null quando não há contas a pagar no horizonte de 30 dias — a razão não
  // se aplica (não existe divisão por zero que faça sentido mostrar), e o
  // nível já vem SAUDAVEL porque não há pressão de caixa nenhuma à vista.
  indice: number | null;
  nivel: NivelLiquidez;
  caixaAtual: number;
  aReceber30d: number;
  aPagar30d: number;
};

function calcularNivel(indice: number): NivelLiquidez {
  if (indice < 1.0) return "RISCO";
  if (indice <= 1.5) return "ATENCAO";
  return "SAUDAVEL";
}

// Mesmo saldo residual (valor − baixas válidas) que aging.ts/saldo-projetado.ts
// já usam — sem piso de data no filtro de vencimento: uma parcela vencida há
// 90 dias ainda satisfaz "vence até daqui 30 dias" (já venceu há muito mais
// tempo que isso), então continua contando.
async function buscarSaldoEmAberto(supabase: Cliente, tenantId: string, tipo: "RECEITA" | "DESPESA", limiteIso: string): Promise<number> {
  const { data } = await supabase
    .from("parcelas")
    .select("valor, eventos_financeiros!inner(tipo), baixas(valor_pago, estornado_em)")
    .eq("tenant_id", tenantId)
    .eq("eventos_financeiros.tipo", tipo)
    .in("status", STATUS_VENCIDO)
    .lte("data_vencimento", limiteIso);

  return (data ?? []).reduce((soma, parcela) => {
    const pago = (parcela.baixas ?? []).filter((b) => !b.estornado_em).reduce((s, b) => s + Number(b.valor_pago), 0);
    return soma + (Number(parcela.valor) - pago);
  }, 0);
}

export async function buscarLiquidezAproximada(supabase: Cliente, tenantId: string): Promise<LiquidezAproximada> {
  const hojeIso = hojeIsoBrasil();
  const limiteIso = somarDias(hojeIso, 30);

  const [saldoProjetado, aReceber30d, aPagar30d] = await Promise.all([
    buscarSaldoProjetado(supabase, tenantId),
    buscarSaldoEmAberto(supabase, tenantId, "RECEITA", limiteIso),
    buscarSaldoEmAberto(supabase, tenantId, "DESPESA", limiteIso),
  ]);

  const caixaAtual = saldoProjetado.saldoAtual;

  if (aPagar30d === 0) {
    return { indice: null, nivel: "SAUDAVEL", caixaAtual, aReceber30d, aPagar30d };
  }

  const indice = (caixaAtual + aReceber30d) / aPagar30d;
  return { indice, nivel: calcularNivel(indice), caixaAtual, aReceber30d, aPagar30d };
}
