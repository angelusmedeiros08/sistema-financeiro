import type { Cliente } from "./regime";

// Janela do mês corrente (UTC) — mesmo recorte usado pelo Painel pra
// "resultado do mês" (painel/dados.ts:inicioDoMes), só que também precisa
// do último dia aqui.
export function mesAtual(): { inicio: string; fim: string } {
  const hoje = new Date();
  const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
  const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0));
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

export type IndicadoresRealizacao = {
  percentualRealizado: number;
  percentualPagoEmAtraso: number;
};

// Os 4 gauges do Dashboard Gerencial (Seção 3.8 do mapeamento): quanto do
// que venceu no mês já foi de fato baixado (%Realizado), e quanto do que
// foi baixado aconteceu depois do vencimento (%Pago em atraso) — mesmo
// recorte de parcela/baixa que aging.ts já usa, olhando pra data_vencimento
// dentro do mês em vez de saldo em aberto hoje.
export async function buscarIndicadoresRealizacao(
  supabase: Cliente,
  params: { tenantId: string; tipo: "RECEITA" | "DESPESA"; mesInicio: string; mesFim: string },
): Promise<IndicadoresRealizacao> {
  const { data } = await supabase
    .from("parcelas")
    .select("valor, data_vencimento, eventos_financeiros!inner(tipo), baixas(valor_pago, data_pagamento, estornado_em)")
    .eq("tenant_id", params.tenantId)
    .eq("eventos_financeiros.tipo", params.tipo)
    .gte("data_vencimento", params.mesInicio)
    .lte("data_vencimento", params.mesFim);

  let total = 0;
  let pago = 0;
  let pagoEmAtraso = 0;

  for (const parcela of data ?? []) {
    total += Number(parcela.valor);
    for (const baixa of parcela.baixas ?? []) {
      if (baixa.estornado_em) continue;
      const valorPago = Number(baixa.valor_pago);
      pago += valorPago;
      if (baixa.data_pagamento > parcela.data_vencimento) pagoEmAtraso += valorPago;
    }
  }

  return {
    percentualRealizado: total > 0 ? pago / total : 0,
    percentualPagoEmAtraso: pago > 0 ? pagoEmAtraso / pago : 0,
  };
}
