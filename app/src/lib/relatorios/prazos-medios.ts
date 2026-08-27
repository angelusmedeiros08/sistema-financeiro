import type { Cliente } from "./regime";
import { hojeIsoBrasil } from "@/lib/data-brasil";

export type PrazoMedio = { dias: number; quantidadeBaixas: number };

function isoMenosMeses(meses: number): string {
  const [ano, mes, dia] = hojeIsoBrasil().split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1 - meses, dia)).toISOString().slice(0, 10);
}

function diasEntre(dataVencimento: string, dataPagamento: string): number {
  const vencimento = new Date(dataVencimento + "T00:00:00Z");
  const pagamento = new Date(dataPagamento + "T00:00:00Z");
  return Math.round((pagamento.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
}

// PMR/PMP ponderados por valor_pago (fórmula em
// docs/pesquisa-indicadores-contabeis-fundamentos.md) — não trunca em zero:
// uma baixa antes do vencimento entra negativa, "cliente paga adiantado" é
// sinal real, não ruído.
async function buscarPrazoMedio(supabase: Cliente, params: { tenantId: string; tipo: "RECEITA" | "DESPESA"; mesesJanela: number }): Promise<PrazoMedio> {
  const dataInicio = isoMenosMeses(params.mesesJanela);
  const dataFim = hojeIsoBrasil();

  const { data } = await supabase
    .from("parcelas")
    .select("data_vencimento, eventos_financeiros!inner(tipo), baixas!inner(valor_pago, data_pagamento, estornado_em)")
    .eq("tenant_id", params.tenantId)
    .eq("eventos_financeiros.tipo", params.tipo)
    .gte("baixas.data_pagamento", dataInicio)
    .lte("baixas.data_pagamento", dataFim);

  let somaPonderada = 0;
  let somaPesos = 0;
  let quantidadeBaixas = 0;

  for (const parcela of data ?? []) {
    for (const baixa of parcela.baixas ?? []) {
      if (baixa.estornado_em) continue;
      if (baixa.data_pagamento < dataInicio || baixa.data_pagamento > dataFim) continue;
      const peso = Number(baixa.valor_pago);
      somaPonderada += diasEntre(parcela.data_vencimento, baixa.data_pagamento) * peso;
      somaPesos += peso;
      quantidadeBaixas += 1;
    }
  }

  return { dias: somaPesos > 0 ? somaPonderada / somaPesos : 0, quantidadeBaixas };
}

export async function buscarPMR(supabase: Cliente, params: { tenantId: string; mesesJanela?: number }): Promise<PrazoMedio> {
  return buscarPrazoMedio(supabase, { tenantId: params.tenantId, tipo: "RECEITA", mesesJanela: params.mesesJanela ?? 6 });
}

export async function buscarPMP(supabase: Cliente, params: { tenantId: string; mesesJanela?: number }): Promise<PrazoMedio> {
  return buscarPrazoMedio(supabase, { tenantId: params.tenantId, tipo: "DESPESA", mesesJanela: params.mesesJanela ?? 6 });
}
