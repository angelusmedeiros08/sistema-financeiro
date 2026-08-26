import type { Cliente, Regime } from "./regime";
import { buscarMovimento } from "./regime";
import { montarHrefLancamentos } from "./drill-down";
import type { Database } from "@/utils/supabase/database.types";

type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];

export type LinhaAnaliseCategoria = {
  categoriaId: string;
  // Id real por trás do clique — igual a categoriaId nesta função (categoria
  // é campo obrigatório, nunca null), mas os outros usos deste mesmo tipo
  // (Distribuição por Forma de Pagamento, Concentração de Receita, em
  // indicadores/page.tsx) reaproveitam o formato com id nulo de verdade
  // (bucket "Não informado"/"Sem pessoa") — por isso o campo é nullable aqui.
  entidadeId: string | null;
  categoriaNome: string;
  ehCustoFixo: boolean;
  total: number;
  percentualDoTotal: number;
  percentualAcumulado: number;
  // Destino do clique nesta fatia, já resolvido — ver drill-down.ts.
  href: string;
};

// Curva ABC: categoria (receita OU despesa, conforme `tipo`) ordenada do
// maior pro menor valor, com % de participação e % acumulado — a mesma
// leitura "quais 20% das categorias respondem por 80%" da Análise de
// Despesas da planilha (Seção 3.6 do mapeamento) e do "Top receitas" do
// Dashboard Gerencial (Seção 3.8), calculada sobre o schema já existente,
// sem tabela nova. `ehCustoFixo` só é significativo pra tipo=DESPESA.
export async function buscarAnaliseCategorias(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; dataInicio: string; dataFim: string; tipo: TipoCategoria; origemHref: string },
): Promise<LinhaAnaliseCategoria[]> {
  const [movimento, { data: categorias }] = await Promise.all([
    buscarMovimento(supabase, params),
    supabase.from("categorias_financeiras").select("id, nome, eh_custo_fixo").eq("tenant_id", params.tenantId).eq("tipo", params.tipo),
  ]);

  const categoriaPorId = new Map((categorias ?? []).map((c) => [c.id, c]));
  const somaPorCategoria = new Map<string, number>();

  for (const linha of movimento) {
    if (linha.tipo !== params.tipo || !linha.categoriaId) continue;
    somaPorCategoria.set(linha.categoriaId, (somaPorCategoria.get(linha.categoriaId) ?? 0) + linha.valor);
  }

  const total = [...somaPorCategoria.values()].reduce((soma, v) => soma + v, 0);

  const linhas = [...somaPorCategoria.entries()]
    .map(([categoriaId, valorTotal]) => {
      const categoria = categoriaPorId.get(categoriaId);
      return {
        categoriaId,
        entidadeId: categoriaId,
        categoriaNome: categoria?.nome ?? "-",
        ehCustoFixo: categoria?.eh_custo_fixo ?? false,
        total: valorTotal,
        href: montarHrefLancamentos({
          tipoEntidade: "categoria",
          entidadeId: categoriaId,
          regime: params.regime,
          periodoInicio: params.dataInicio,
          periodoFim: params.dataFim,
          origemHref: params.origemHref,
        }),
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
