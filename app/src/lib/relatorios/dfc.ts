import type { Cliente, MovimentoLinha } from "./regime";
import { buscarMovimento, valorComSinal } from "./regime";
import { buscarAnaliseCategorias } from "./analise-despesas";
import type { Database } from "@/utils/supabase/database.types";

type IdDfcLinhaDre = Database["public"]["Enums"]["id_dfc_linha_dre"];
type AtividadeDfc = "OPERACIONAL" | "INVESTIMENTO" | "FINANCIAMENTO";

// A DFC por atividade não é hierárquica como a DRE — é soma plana por
// atividade, sem cascata. NAO_OPERACIONAL_* dobra dentro de OPERACIONAL
// (a maioria dos formatos de DFC reais trata resultado não-operacional
// pequeno junto do operacional; ver spec).
function dobrarAtividade(idDfc: IdDfcLinhaDre): AtividadeDfc {
  if (idDfc === "INVESTIMENTO") return "INVESTIMENTO";
  if (idDfc === "FINANCIAMENTO") return "FINANCIAMENTO";
  return "OPERACIONAL";
}

const ROTULO_ATIVIDADE: Record<AtividadeDfc | "GERACAO_CAIXA", string> = {
  OPERACIONAL: "Atividades operacionais",
  INVESTIMENTO: "Atividades de investimento",
  FINANCIAMENTO: "Atividades de financiamento",
  GERACAO_CAIXA: "Geração de caixa",
};

export type LinhaDfcMatriz = {
  atividade: AtividadeDfc | "GERACAO_CAIXA";
  rotulo: string;
  mesesPrevisto: number[];
  mesesRealizado: number[];
  totalPrevisto: number;
  totalRealizado: number;
};

// Previsto (vencimento) e Realizado (pagamento) lado a lado, mesma leitura
// que /fluxo-caixa já faz na aba "Previsto × Realizado" — só que agrupado
// por atividade de DFC em vez de entradas/saídas cruas. "Geração de caixa"
// é a soma de tudo que tem id_dfc não nulo, não uma lista de exclusão por
// nome (ver spec 2026-08-14-dfc-por-atividade-design.md).
export async function buscarDFCMatriz(supabase: Cliente, params: { tenantId: string; ano: number }): Promise<LinhaDfcMatriz[]> {
  const dataInicio = `${params.ano}-01-01`;
  const dataFim = `${params.ano}-12-31`;

  const { data: linhas } = await supabase
    .from("linhas_dre")
    .select("id_dfc, linha_dre_categorias(categoria_id)")
    .eq("tenant_id", params.tenantId)
    .not("id_dfc", "is", null);

  const categoriaParaAtividade = new Map<string, AtividadeDfc>();
  for (const linha of linhas ?? []) {
    if (!linha.id_dfc) continue;
    const atividade = dobrarAtividade(linha.id_dfc);
    for (const c of linha.linha_dre_categorias) {
      categoriaParaAtividade.set(c.categoria_id, atividade);
    }
  }

  const [movimentoPrevisto, movimentoRealizado] = await Promise.all([
    buscarMovimento(supabase, { tenantId: params.tenantId, regime: "previsto", dataInicio, dataFim }),
    buscarMovimento(supabase, { tenantId: params.tenantId, regime: "realizado", dataInicio, dataFim }),
  ]);

  const somaPorAtividade: Record<AtividadeDfc, { previsto: number[]; realizado: number[] }> = {
    OPERACIONAL: { previsto: new Array(12).fill(0), realizado: new Array(12).fill(0) },
    INVESTIMENTO: { previsto: new Array(12).fill(0), realizado: new Array(12).fill(0) },
    FINANCIAMENTO: { previsto: new Array(12).fill(0), realizado: new Array(12).fill(0) },
  };

  function acumular(movimento: MovimentoLinha[], chave: "previsto" | "realizado") {
    for (const linha of movimento) {
      if (!linha.categoriaId) continue;
      const atividade = categoriaParaAtividade.get(linha.categoriaId);
      if (!atividade) continue;
      const mesIndex = Number(linha.data.slice(5, 7)) - 1;
      somaPorAtividade[atividade][chave][mesIndex] += valorComSinal(linha);
    }
  }
  acumular(movimentoPrevisto, "previsto");
  acumular(movimentoRealizado, "realizado");

  const atividades: AtividadeDfc[] = ["OPERACIONAL", "INVESTIMENTO", "FINANCIAMENTO"];
  const linhasResultado: LinhaDfcMatriz[] = atividades.map((atividade) => {
    const mesesPrevisto = somaPorAtividade[atividade].previsto;
    const mesesRealizado = somaPorAtividade[atividade].realizado;
    return {
      atividade,
      rotulo: ROTULO_ATIVIDADE[atividade],
      mesesPrevisto,
      mesesRealizado,
      totalPrevisto: mesesPrevisto.reduce((s, v) => s + v, 0),
      totalRealizado: mesesRealizado.reduce((s, v) => s + v, 0),
    };
  });

  const mesesGeracaoPrevisto = Array.from({ length: 12 }, (_, i) => linhasResultado.reduce((s, l) => s + l.mesesPrevisto[i], 0));
  const mesesGeracaoRealizado = Array.from({ length: 12 }, (_, i) => linhasResultado.reduce((s, l) => s + l.mesesRealizado[i], 0));

  linhasResultado.push({
    atividade: "GERACAO_CAIXA",
    rotulo: ROTULO_ATIVIDADE.GERACAO_CAIXA,
    mesesPrevisto: mesesGeracaoPrevisto,
    mesesRealizado: mesesGeracaoRealizado,
    totalPrevisto: mesesGeracaoPrevisto.reduce((s, v) => s + v, 0),
    totalRealizado: mesesGeracaoRealizado.reduce((s, v) => s + v, 0),
  });

  return linhasResultado;
}

export type CategoriaFluxo = { nome: string; valor: number; outros?: boolean };
export type ComposicaoFluxoCaixa = {
  receitas: CategoriaFluxo[];
  despesas: CategoriaFluxo[];
  totalReceitas: number;
  totalDespesas: number;
};

const MAX_CATEGORIAS_COMPOSICAO = 5;

// Composição do caixa que a matriz da DFC não mostra: de onde a receita veio
// e pra onde ela foi, por categoria. Era um diagrama de Sankey (categorias
// convergindo num nó central de "Receita realizada", se abrindo de novo nas
// categorias de despesa) — trocado por duas colunas de barra horizontal
// (achado real: quando uma categoria domina o total, como costuma
// acontecer — "Despesas com Pessoal" respondendo por 98%+ do total é comum
// numa folha pequena — as faixas do Sankey viravam fiapos de <1px com
// rótulo ilegível, sobrepondo uns aos outros). Barra sempre tem altura
// legível, não depende de proporção com a maior categoria. Complementar à
// matriz por atividade, não substituto (Seção 5 da pesquisa de referências
// visuais).
export async function buscarComposicaoFluxoCaixa(supabase: Cliente, params: { tenantId: string; ano: number }): Promise<ComposicaoFluxoCaixa> {
  const dataInicio = `${params.ano}-01-01`;
  const dataFim = `${params.ano}-12-31`;

  // origemHref exigido pela assinatura mas nunca usado aqui — agruparTopN
  // abaixo descarta o href junto com o resto de LinhaAnaliseCategoria,
  // esta composição não é renderizada como donut clicável (ver spec, fora
  // do escopo da 1ª leva).
  const [receitas, despesas] = await Promise.all([
    buscarAnaliseCategorias(supabase, { tenantId: params.tenantId, regime: "realizado", dataInicio, dataFim, tipo: "RECEITA", origemHref: "/relatorios/dfc" }),
    buscarAnaliseCategorias(supabase, { tenantId: params.tenantId, regime: "realizado", dataInicio, dataFim, tipo: "DESPESA", origemHref: "/relatorios/dfc" }),
  ]);

  function agruparTopN(linhas: typeof receitas, rotuloResto: string): CategoriaFluxo[] {
    const ordenadas = [...linhas].filter((l) => l.total > 0).sort((a, b) => b.total - a.total);
    const principais = ordenadas.slice(0, MAX_CATEGORIAS_COMPOSICAO);
    const resto = ordenadas.slice(MAX_CATEGORIAS_COMPOSICAO).reduce((soma, l) => soma + l.total, 0);
    const grupos: CategoriaFluxo[] = principais.map((l) => ({ nome: l.categoriaNome, valor: l.total }));
    if (resto > 0) grupos.push({ nome: rotuloResto, valor: resto, outros: true });
    return grupos;
  }

  const gruposReceita = agruparTopN(receitas, "Outras receitas");
  const gruposDespesa = agruparTopN(despesas, "Outras despesas");

  return {
    receitas: gruposReceita,
    despesas: gruposDespesa,
    totalReceitas: gruposReceita.reduce((s, g) => s + g.valor, 0),
    totalDespesas: gruposDespesa.reduce((s, g) => s + g.valor, 0),
  };
}
