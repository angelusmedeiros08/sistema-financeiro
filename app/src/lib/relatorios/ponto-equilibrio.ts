import type { Cliente, Regime } from "./regime";
import { buscarMovimento } from "./regime";

export type BaseMC = "receita_liquida" | "receita_operacional";

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// 12 janelas de mês (1º ao último dia) do ano — insumo de buscarEvolucaoPontoEquilibrio.
export function mesesDoAno(ano: number): { inicio: string; fim: string; chave: string }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    return {
      inicio: `${ano}-${String(mes).padStart(2, "0")}-01`,
      fim: `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`,
      chave: NOMES_MES[i],
    };
  });
}

export type PontoEquilibrioResultado = {
  receitaTotal: number;
  receitaOperacional: number;
  receitaLiquida: number;
  gastosFixos: number;
  gastosVariaveis: number;
  margemContribuicao: number;
  margemContribuicaoPercentual: number;
  pontoEquilibrio: number;
};

// Linhas 1/2/3 de tbTotalizadoresDRE (Receitas operacionais / Devoluções /
// Tributos sobre a venda — ver docs/superpowers/specs/2026-08-14-dre-matriz-mensal-design.md)
// resolvem Receita Operacional bruta e as duas deduções que a separam de
// Receita Líquida (linha 4 = 1 − 2 − 3). Tenant sem categoria vinculada a
// devoluções/tributos simplesmente tem receitaLiquida = receitaOperacional.
async function buscarCategoriasDasLinhasReceita(
  supabase: Cliente,
  tenantId: string,
): Promise<{ operacional: Set<string>; deducoes: Set<string> }> {
  const { data } = await supabase
    .from("linhas_dre")
    .select("ordem, linha_dre_categorias(categoria_id)")
    .eq("tenant_id", tenantId)
    .in("ordem", [1, 2, 3]);

  const operacional = new Set<string>();
  const deducoes = new Set<string>();
  for (const linha of data ?? []) {
    const destino = linha.ordem === 1 ? operacional : deducoes;
    for (const vinculo of linha.linha_dre_categorias) destino.add(vinculo.categoria_id);
  }
  return { operacional, deducoes };
}

// PE = Gastos Fixos ÷ MC% (Seção 6.4 do mapeamento) — baseMC replica o
// slicer tbReceitaBaseAV da planilha: MC% pode ser calculada sobre Receita
// Líquida (Receita Operacional − Devoluções − Tributos sobre a venda) ou
// sobre Receita Operacional bruta.
export async function buscarPontoEquilibrio(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; dataInicio: string; dataFim: string; baseMC?: BaseMC },
): Promise<PontoEquilibrioResultado> {
  const [movimento, { data: categoriasFixas }, categoriasReceita] = await Promise.all([
    buscarMovimento(supabase, params),
    supabase.from("categorias_financeiras").select("id").eq("tenant_id", params.tenantId).eq("eh_custo_fixo", true),
    buscarCategoriasDasLinhasReceita(supabase, params.tenantId),
  ]);

  const idsFixos = new Set((categoriasFixas ?? []).map((c) => c.id));

  let receitaTotal = 0;
  let receitaOperacional = 0;
  let deducoesReceita = 0;
  let gastosFixos = 0;
  let gastosVariaveis = 0;

  for (const linha of movimento) {
    if (linha.tipo === "RECEITA") {
      receitaTotal += linha.valor;
      if (linha.categoriaId && categoriasReceita.deducoes.has(linha.categoriaId)) deducoesReceita += linha.valor;
      else receitaOperacional += linha.valor;
      continue;
    }
    if (linha.categoriaId && idsFixos.has(linha.categoriaId)) gastosFixos += linha.valor;
    else gastosVariaveis += linha.valor;
  }

  const receitaLiquida = receitaOperacional - deducoesReceita;
  const baseEscolhida = params.baseMC === "receita_operacional" ? receitaOperacional : receitaLiquida;

  // Antes usava receitaTotal (bruta, com dedução ainda somada) aqui —
  // resíduo de antes das deduções existirem no cálculo (só tinham sido
  // aplicadas ao denominador da margem %, nunca a este numerador). Divergia
  // da própria "Margem de contribuição" da DRE (que já desconta dedução) e,
  // dependendo do tipo cadastrado pra categoria de dedução, podia superestimar
  // em até 2x o valor da dedução (achado em revisão de código). Usar a mesma
  // baseEscolhida do denominador mantém numerador e percentual consistentes
  // entre si e com a DRE.
  const margemContribuicao = baseEscolhida - gastosVariaveis;
  const margemContribuicaoPercentual = baseEscolhida > 0 ? margemContribuicao / baseEscolhida : 0;
  const pontoEquilibrio = margemContribuicaoPercentual > 0 ? gastosFixos / margemContribuicaoPercentual : 0;

  return {
    receitaTotal,
    receitaOperacional,
    receitaLiquida,
    gastosFixos,
    gastosVariaveis,
    margemContribuicao,
    margemContribuicaoPercentual,
    pontoEquilibrio,
  };
}

export type PontoEvolucaoPE = { chave: string; pontoEquilibrio: number; receitaTotal: number; margemContribuicaoPercentual: number };

export async function buscarEvolucaoPontoEquilibrio(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; baseMC?: BaseMC; meses: { inicio: string; fim: string; chave: string }[] },
): Promise<PontoEvolucaoPE[]> {
  const resultados = await Promise.all(
    params.meses.map((mes) =>
      buscarPontoEquilibrio(supabase, {
        tenantId: params.tenantId,
        regime: params.regime,
        baseMC: params.baseMC,
        dataInicio: mes.inicio,
        dataFim: mes.fim,
      }),
    ),
  );
  return params.meses.map((mes, i) => ({
    chave: mes.chave,
    pontoEquilibrio: resultados[i].pontoEquilibrio,
    receitaTotal: resultados[i].receitaTotal,
    margemContribuicaoPercentual: resultados[i].margemContribuicaoPercentual,
  }));
}
