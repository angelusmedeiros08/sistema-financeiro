// Tipos e leitura de vw_movimento_* compartilhados por todo relatório —
// o mesmo mecanismo de "um dataset, três leituras" da planilha de
// referência (Seção 6.1 do mapeamento), agora como duas views SQL em vez
// de um SWITCH de DAX.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";

export type Cliente = SupabaseClient<Database>;
export type Regime = "competencia" | "previsto" | "realizado";
export type Granularidade = "dia" | "semana" | "mes" | "trimestre" | "ano";

export type MovimentoLinha = {
  eventoFinanceiroId: string;
  categoriaId: string | null;
  centroCustoId: string | null;
  contaFinanceiraId: string | null;
  pessoaId: string | null;
  tipo: "RECEITA" | "DESPESA";
  valor: number;
  data: string;
};

// Busca o movimento bruto (linha a linha, já com o sinal aplicado por
// tipo) para um período — cada relatório agrega isso do jeito que precisar
// (por categoria, por centro de custo, por mês...), sem duplicar a leitura
// da view.
export async function buscarMovimento(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; dataInicio: string; dataFim: string },
): Promise<MovimentoLinha[]> {
  if (params.regime === "realizado") {
    const { data } = await supabase
      .from("vw_movimento_realizado")
      .select("evento_financeiro_id, categoria_id, centro_custo_id, conta_financeira_id, pessoa_id, tipo, valor, data_pagamento")
      .eq("tenant_id", params.tenantId)
      .gte("data_pagamento", params.dataInicio)
      .lte("data_pagamento", params.dataFim);

    return (data ?? [])
      .filter((l) => l.tipo && l.data_pagamento)
      .map((l) => ({
        eventoFinanceiroId: l.evento_financeiro_id!,
        categoriaId: l.categoria_id,
        centroCustoId: l.centro_custo_id,
        contaFinanceiraId: l.conta_financeira_id,
        pessoaId: l.pessoa_id,
        tipo: l.tipo!,
        valor: Number(l.valor),
        data: l.data_pagamento!,
      }));
  }

  const coluna = params.regime === "competencia" ? "data_competencia" : "data_vencimento";
  const { data } = await supabase
    .from("vw_movimento_competencia_previsto")
    .select("evento_financeiro_id, categoria_id, centro_custo_id, conta_financeira_id, pessoa_id, tipo, valor, data_competencia, data_vencimento")
    .eq("tenant_id", params.tenantId)
    .gte(coluna, params.dataInicio)
    .lte(coluna, params.dataFim);

  return (data ?? [])
    .filter((l) => l.tipo)
    .map((l) => ({
      eventoFinanceiroId: l.evento_financeiro_id!,
      categoriaId: l.categoria_id,
      centroCustoId: l.centro_custo_id,
      contaFinanceiraId: l.conta_financeira_id,
      pessoaId: l.pessoa_id,
      tipo: l.tipo!,
      valor: Number(l.valor),
      data: (params.regime === "competencia" ? l.data_competencia : l.data_vencimento)!,
    }));
}

// Sinal aplicado uma vez só, aqui — nenhum relatório deve assumir "toda
// despesa é negativa" direto numa query; sempre passar pela mesma função.
export function valorComSinal(linha: Pick<MovimentoLinha, "tipo" | "valor">): number {
  return linha.tipo === "RECEITA" ? linha.valor : -linha.valor;
}

export function chaveGranularidade(dataIso: string, granularidade: Granularidade): string {
  const [ano, mes, dia] = dataIso.slice(0, 10).split("-").map(Number);
  switch (granularidade) {
    case "dia":
      return dataIso.slice(0, 10);
    case "semana": {
      const data = new Date(Date.UTC(ano, mes - 1, dia));
      const diaSemanaISO = (data.getUTCDay() + 6) % 7; // 0 = segunda
      data.setUTCDate(data.getUTCDate() - diaSemanaISO);
      return data.toISOString().slice(0, 10);
    }
    case "mes":
      return `${ano}-${String(mes).padStart(2, "0")}`;
    case "trimestre":
      return `${ano}-T${Math.ceil(mes / 3)}`;
    case "ano":
      return String(ano);
  }
}
