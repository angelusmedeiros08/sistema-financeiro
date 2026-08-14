import type { Cliente, Regime } from "./regime";
import { buscarMovimento } from "./regime";

export type PontoEquilibrioResultado = {
  receitaTotal: number;
  gastosFixos: number;
  gastosVariaveis: number;
  margemContribuicao: number;
  margemContribuicaoPercentual: number;
  pontoEquilibrio: number;
};

// PE = Gastos Fixos ÷ MC% (Seção 6.4 do mapeamento) — a planilha de
// referência ainda deixa escolher a base do MC% entre Receita Líquida e
// Receita Operacional; aqui a base é a receita total do período, sem essa
// distinção (que exigiria classificar deduções/impostos como sua própria
// categoria de receita, um refinamento fora do que foi pedido nesta fase).
export async function buscarPontoEquilibrio(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; dataInicio: string; dataFim: string },
): Promise<PontoEquilibrioResultado> {
  const [movimento, { data: categoriasFixas }] = await Promise.all([
    buscarMovimento(supabase, params),
    supabase.from("categorias_financeiras").select("id").eq("tenant_id", params.tenantId).eq("eh_custo_fixo", true),
  ]);

  const idsFixos = new Set((categoriasFixas ?? []).map((c) => c.id));

  let receitaTotal = 0;
  let gastosFixos = 0;
  let gastosVariaveis = 0;

  for (const linha of movimento) {
    if (linha.tipo === "RECEITA") {
      receitaTotal += linha.valor;
      continue;
    }
    if (linha.categoriaId && idsFixos.has(linha.categoriaId)) gastosFixos += linha.valor;
    else gastosVariaveis += linha.valor;
  }

  const margemContribuicao = receitaTotal - gastosVariaveis;
  const margemContribuicaoPercentual = receitaTotal > 0 ? margemContribuicao / receitaTotal : 0;
  const pontoEquilibrio = margemContribuicaoPercentual > 0 ? gastosFixos / margemContribuicaoPercentual : 0;

  return { receitaTotal, gastosFixos, gastosVariaveis, margemContribuicao, margemContribuicaoPercentual, pontoEquilibrio };
}

export type PontoEvolucaoPE = { chave: string; pontoEquilibrio: number; receitaTotal: number };

export async function buscarEvolucaoPontoEquilibrio(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; meses: { inicio: string; fim: string; chave: string }[] },
): Promise<PontoEvolucaoPE[]> {
  const resultados = await Promise.all(
    params.meses.map((mes) =>
      buscarPontoEquilibrio(supabase, { tenantId: params.tenantId, regime: params.regime, dataInicio: mes.inicio, dataFim: mes.fim }),
    ),
  );
  return params.meses.map((mes, i) => ({ chave: mes.chave, pontoEquilibrio: resultados[i].pontoEquilibrio, receitaTotal: resultados[i].receitaTotal }));
}
