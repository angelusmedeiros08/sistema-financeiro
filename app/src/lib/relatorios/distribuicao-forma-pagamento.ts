import type { Cliente } from "./regime";
import { montarHrefLancamentos } from "./drill-down";
import { hojeIsoBrasil } from "@/lib/data-brasil";

export type LinhaDistribuicaoFormaPagamento = {
  formaPagamentoId: string | null;
  nome: string;
  valorTotal: number;
  percentualDoTotal: number;
  atrasoMedioDias: number;
  href: string;
};

function isoMenosMeses(meses: number): string {
  const [ano, mes, dia] = hojeIsoBrasil().split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1 - meses, dia)).toISOString().slice(0, 10);
}

function diasEntre(dataVencimento: string, dataPagamento: string): number {
  const vencimento = new Date(dataVencimento + "T00:00:00Z");
  const pagamento = new Date(dataPagamento + "T00:00:00Z");
  return Math.round((pagamento.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
}

// "Como me pagam" — distribuição de baixas por forma de pagamento, fonte
// de verdade é a baixa (baixas.forma_pagamento_id), não
// parcelas.metodo_pagamento (só "o último método usado", ver spec). Baixas
// antigas sem forma de pagamento (dado histórico, sem backfill por
// heurística) agrupam em "Não informado" em vez de sumirem do total.
export async function buscarDistribuicaoFormaPagamento(
  supabase: Cliente,
  params: { tenantId: string; mesesJanela?: number; origemHref: string },
): Promise<LinhaDistribuicaoFormaPagamento[]> {
  const mesesJanela = params.mesesJanela ?? 6;
  const dataInicio = isoMenosMeses(mesesJanela);
  const dataFim = hojeIsoBrasil();

  const { data } = await supabase
    .from("baixas")
    .select("valor_pago, data_pagamento, forma_pagamento_id, formas_pagamento(nome), parcelas!inner(data_vencimento)")
    .eq("tenant_id", params.tenantId)
    .is("estornado_em", null)
    .gte("data_pagamento", dataInicio)
    .lte("data_pagamento", dataFim);

  type Acumulado = { nome: string; valorTotal: number; somaPonderadaAtraso: number };
  const porForma = new Map<string, Acumulado>();

  for (const baixa of data ?? []) {
    const chave = baixa.forma_pagamento_id ?? "__nao_informado__";
    const atual = porForma.get(chave) ?? {
      nome: baixa.forma_pagamento_id ? (baixa.formas_pagamento?.nome ?? "-") : "Não informado",
      valorTotal: 0,
      somaPonderadaAtraso: 0,
    };
    const valor = Number(baixa.valor_pago);
    atual.valorTotal += valor;
    atual.somaPonderadaAtraso += diasEntre(baixa.parcelas!.data_vencimento, baixa.data_pagamento) * valor;
    porForma.set(chave, atual);
  }

  const total = [...porForma.values()].reduce((soma, v) => soma + v.valorTotal, 0);

  return [...porForma.entries()]
    .map(([chave, acumulado]) => {
      const formaPagamentoId = chave === "__nao_informado__" ? null : chave;
      return {
        formaPagamentoId,
        nome: acumulado.nome,
        valorTotal: acumulado.valorTotal,
        percentualDoTotal: total > 0 ? acumulado.valorTotal / total : 0,
        atrasoMedioDias: acumulado.valorTotal > 0 ? acumulado.somaPonderadaAtraso / acumulado.valorTotal : 0,
        href: montarHrefLancamentos({
          tipoEntidade: "forma_pagamento",
          entidadeId: formaPagamentoId,
          // Ignorado por /lancamentos pra esta dimensão (forma de pagamento
          // é sempre baseada em baixas.data_pagamento, sem noção de
          // "previsto"/"competência") — "realizado" só por ser o rótulo
          // mais correto pro contrato de URL, nunca é lido de volta.
          regime: "realizado",
          periodoInicio: dataInicio,
          periodoFim: dataFim,
          origemHref: params.origemHref,
        }),
      };
    })
    .sort((a, b) => b.valorTotal - a.valorTotal);
}
