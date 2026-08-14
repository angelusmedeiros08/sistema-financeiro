import type { Cliente, Regime } from "./regime";
import { buscarMovimento } from "./regime";

export type LinhaAnaliseDespesa = {
  categoriaId: string;
  categoriaNome: string;
  ehCustoFixo: boolean;
  total: number;
  percentualDoTotal: number;
  percentualAcumulado: number;
};

// Curva ABC: categoria de despesa ordenada do maior pro menor gasto, com
// % de participação e % acumulado — a mesma leitura "quais 20% das
// categorias respondem por 80% do gasto" da Análise de Despesas da
// planilha (Seção 3.6 do mapeamento), calculada sobre o schema já
// existente, sem tabela nova.
export async function buscarAnaliseDespesas(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; dataInicio: string; dataFim: string },
): Promise<LinhaAnaliseDespesa[]> {
  const [movimento, { data: categorias }] = await Promise.all([
    buscarMovimento(supabase, params),
    supabase.from("categorias_financeiras").select("id, nome, eh_custo_fixo").eq("tenant_id", params.tenantId).eq("tipo", "DESPESA"),
  ]);

  const categoriaPorId = new Map((categorias ?? []).map((c) => [c.id, c]));
  const somaPorCategoria = new Map<string, number>();

  for (const linha of movimento) {
    if (linha.tipo !== "DESPESA" || !linha.categoriaId) continue;
    somaPorCategoria.set(linha.categoriaId, (somaPorCategoria.get(linha.categoriaId) ?? 0) + linha.valor);
  }

  const total = [...somaPorCategoria.values()].reduce((soma, v) => soma + v, 0);

  const linhas = [...somaPorCategoria.entries()]
    .map(([categoriaId, valorTotal]) => {
      const categoria = categoriaPorId.get(categoriaId);
      return {
        categoriaId,
        categoriaNome: categoria?.nome ?? "—",
        ehCustoFixo: categoria?.eh_custo_fixo ?? false,
        total: valorTotal,
      };
    })
    .sort((a, b) => b.total - a.total);

  let acumulado = 0;
  return linhas.map((linha) => {
    const percentualDoTotal = total > 0 ? linha.total / total : 0;
    acumulado += percentualDoTotal;
    return { ...linha, percentualDoTotal, percentualAcumulado: acumulado };
  });
}
