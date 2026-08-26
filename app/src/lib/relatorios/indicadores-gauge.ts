import type { Cliente } from "./regime";

// Janela do mês corrente (UTC) — mesmo recorte que `obterResultadoDoMes` e
// `obterRecebidoPagoDoMes` usam (painel/dados.ts), só que também precisa
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

export type PontoIndicadorRealizacao = { mes: string } & IndicadoresRealizacao;

// Mesma leitura de buscarIndicadoresRealizacao, mas numa janela de N meses
// buscada de uma vez só (não N queries) e agrupada por mês de vencimento —
// alimenta a mini-tendência ao lado do arco de cada gauge.
export async function buscarSerieIndicadoresRealizacao(
  supabase: Cliente,
  params: { tenantId: string; tipo: "RECEITA" | "DESPESA"; meses: number },
): Promise<PontoIndicadorRealizacao[]> {
  const hoje = new Date();
  const inicioJanela = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - (params.meses - 1), 1));
  const fimJanela = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0));

  const { data } = await supabase
    .from("parcelas")
    .select("valor, data_vencimento, eventos_financeiros!inner(tipo), baixas(valor_pago, data_pagamento, estornado_em)")
    .eq("tenant_id", params.tenantId)
    .eq("eventos_financeiros.tipo", params.tipo)
    .gte("data_vencimento", inicioJanela.toISOString().slice(0, 10))
    .lte("data_vencimento", fimJanela.toISOString().slice(0, 10));

  const buckets = new Map<string, { total: number; pago: number; pagoEmAtraso: number }>();
  for (let i = params.meses - 1; i >= 0; i--) {
    const chave = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1)).toISOString().slice(0, 7);
    buckets.set(chave, { total: 0, pago: 0, pagoEmAtraso: 0 });
  }

  for (const parcela of data ?? []) {
    const bucket = buckets.get(parcela.data_vencimento.slice(0, 7));
    if (!bucket) continue;
    bucket.total += Number(parcela.valor);
    for (const baixa of parcela.baixas ?? []) {
      if (baixa.estornado_em) continue;
      const valorPago = Number(baixa.valor_pago);
      bucket.pago += valorPago;
      if (baixa.data_pagamento > parcela.data_vencimento) bucket.pagoEmAtraso += valorPago;
    }
  }

  return Array.from(buckets.entries()).map(([mes, b]) => ({
    mes,
    percentualRealizado: b.total > 0 ? b.pago / b.total : 0,
    percentualPagoEmAtraso: b.pago > 0 ? b.pagoEmAtraso / b.pago : 0,
  }));
}
