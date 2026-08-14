import type { Cliente, Regime } from "./regime";
import { buscarMovimento, valorComSinal } from "./regime";
import type { Database } from "@/utils/supabase/database.types";

type TipoCalcLinhaDre = Database["public"]["Enums"]["tipo_linha_dre"];
type IdDfcLinhaDre = Database["public"]["Enums"]["id_dfc_linha_dre"];
type Resultado = { sucesso: true } | { erro: string };

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type LinhaDreResultado = {
  id: string;
  ordem: number;
  rotulo: string;
  tipoCalc: TipoCalcLinhaDre;
  valorDireto: number;
  valorAcumulado: number;
};

type LinhaComCategorias = { id: string; ordem: number; rotulo: string; tipo_calc: TipoCalcLinhaDre; linha_dre_categorias: { categoria_id: string }[] };

// Motor único da cascata do DRE — roda uma vez por "coluna" (um período
// único, um mês da matriz, ou o total do ano). FOLHA soma direto as
// categorias vinculadas; SUBTOTAL/SUBTOTAL_ALTERNATIVO mostram o acumulado
// de tudo que veio antes (só linhas FOLHA contribuem valor real, então
// nunca conta um subtotal duas vezes); RESULTADO_NAO_OPERACIONAL é um caso à
// parte — não é a soma desde a linha 1, é a soma só do bloco de linhas FOLHA
// desde o último marcador (Tipo_Calc=4 tem sua própria medida na planilha
// real, `RESULTADO_N_OPERACIONAL`, distinta de `ACUMULADA`; sem isso, a
// linha "Resultado não operacional" mostraria o mesmo número que "Lucro
// antes dos impostos" logo depois dela — redundante e sem sentido de
// leitura).
function calcularCascata(linhas: LinhaComCategorias[], somaPorCategoria: Map<string, number>): Map<string, number> {
  let acumulado = 0;
  let somaBlocoAtual = 0;
  const porLinha = new Map<string, number>();

  for (const linha of linhas) {
    if (linha.tipo_calc === "FOLHA") {
      const valor = linha.linha_dre_categorias.reduce((soma, c) => soma + (somaPorCategoria.get(c.categoria_id) ?? 0), 0);
      acumulado += valor;
      somaBlocoAtual += valor;
      porLinha.set(linha.id, valor);
    } else if (linha.tipo_calc === "RESULTADO_NAO_OPERACIONAL") {
      porLinha.set(linha.id, somaBlocoAtual);
      somaBlocoAtual = 0;
    } else {
      porLinha.set(linha.id, acumulado);
      somaBlocoAtual = 0;
    }
  }

  return porLinha;
}

async function buscarLinhasEMovimento(supabase: Cliente, params: { tenantId: string; regime: Regime; dataInicio: string; dataFim: string }) {
  const [{ data: linhas }, movimento] = await Promise.all([
    supabase
      .from("linhas_dre")
      .select("id, ordem, rotulo, tipo_calc, linha_dre_categorias(categoria_id)")
      .eq("tenant_id", params.tenantId)
      .order("ordem"),
    buscarMovimento(supabase, params),
  ]);
  return { linhas: (linhas ?? []) as LinhaComCategorias[], movimento };
}

export async function buscarDRE(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; dataInicio: string; dataFim: string },
): Promise<LinhaDreResultado[]> {
  const { linhas, movimento } = await buscarLinhasEMovimento(supabase, params);

  const somaPorCategoria = new Map<string, number>();
  for (const linha of movimento) {
    if (!linha.categoriaId) continue;
    somaPorCategoria.set(linha.categoriaId, (somaPorCategoria.get(linha.categoriaId) ?? 0) + valorComSinal(linha));
  }

  const valorPorLinha = calcularCascata(linhas, somaPorCategoria);

  // valorAcumulado é um segundo acumulador simples, só sobe com FOLHA — pra
  // SUBTOTAL/SUBTOTAL_ALTERNATIVO isso reproduz o mesmo número que
  // valorDireto (calcularCascata já devolveu o acumulado ali), e pra
  // RESULTADO_NAO_OPERACIONAL mostra o acumulado até aquele ponto (que
  // depois reaparece igual em "Lucro antes dos impostos", como esperado).
  let acumulado = 0;
  return linhas.map((linha) => {
    const valorDireto = valorPorLinha.get(linha.id) ?? 0;
    if (linha.tipo_calc === "FOLHA") acumulado += valorDireto;
    return {
      id: linha.id,
      ordem: linha.ordem,
      rotulo: linha.rotulo,
      tipoCalc: linha.tipo_calc,
      valorDireto,
      valorAcumulado: acumulado,
    };
  });
}

export type LinhaDreMatriz = {
  id: string;
  ordem: number;
  rotulo: string;
  tipoCalc: TipoCalcLinhaDre;
  meses: number[];
  total: number;
  avPercentual: number;
};

// Matriz Jan-Dez + Total + AV% — cada coluna (cada mês, e o total do ano) é
// uma cascata independente (calcularCascata rodada 13x), não uma soma das
// colunas mensais já processadas — pra uma linha SUBTOTAL isso faria
// diferença (soma de 12 acumulados mensais não é o acumulado do ano).
export async function buscarDREMatriz(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; ano: number },
): Promise<LinhaDreMatriz[]> {
  const dataInicio = `${params.ano}-01-01`;
  const dataFim = `${params.ano}-12-31`;
  const { linhas, movimento } = await buscarLinhasEMovimento(supabase, { tenantId: params.tenantId, regime: params.regime, dataInicio, dataFim });

  const somaPorCategoriaMes = new Map<string, number[]>();
  for (const linha of movimento) {
    if (!linha.categoriaId) continue;
    const mesIndex = Number(linha.data.slice(5, 7)) - 1;
    const atual = somaPorCategoriaMes.get(linha.categoriaId) ?? new Array(12).fill(0);
    atual[mesIndex] += valorComSinal(linha);
    somaPorCategoriaMes.set(linha.categoriaId, atual);
  }

  const somaPorCategoriaAno = new Map<string, number>();
  for (const [categoriaId, meses] of somaPorCategoriaMes) {
    somaPorCategoriaAno.set(categoriaId, meses.reduce((s, v) => s + v, 0));
  }

  const colunasMensais = Array.from({ length: 12 }, (_, mes) => {
    const somaDoMes = new Map([...somaPorCategoriaMes].map(([id, valores]) => [id, valores[mes]]));
    return calcularCascata(linhas, somaDoMes);
  });
  const colunaTotal = calcularCascata(linhas, somaPorCategoriaAno);

  const totalReceitasOperacionais = linhas.length > 0 ? (colunaTotal.get(linhas[0].id) ?? 0) : 0;

  return linhas.map((linha) => {
    const total = colunaTotal.get(linha.id) ?? 0;
    return {
      id: linha.id,
      ordem: linha.ordem,
      rotulo: linha.rotulo,
      tipoCalc: linha.tipo_calc,
      meses: colunasMensais.map((c) => c.get(linha.id) ?? 0),
      total,
      avPercentual: totalReceitasOperacionais !== 0 ? total / totalReceitasOperacionais : 0,
    };
  });
}

export type IndicadorMensal = { chave: string; mc: number; margemBruta: number; ebitda: number; margemLiquida: number };

// Indicadores mensais — todos derivados de linhas que já existem na matriz
// (ordem 4 = Receita líquida, 7 = Margem de contribuição, 8 = Lucro Bruto,
// 11 = EBITDA, 20 = Lucro líquido), nenhum cálculo novo inventado.
export async function buscarDREIndicadores(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; ano: number },
): Promise<IndicadorMensal[]> {
  const matriz = await buscarDREMatriz(supabase, params);
  const porOrdem = new Map(matriz.map((l) => [l.ordem, l]));
  const receitaLiquida = porOrdem.get(4);
  const mc = porOrdem.get(7);
  const lucroBruto = porOrdem.get(8);
  const ebitda = porOrdem.get(11);
  const lucroLiquido = porOrdem.get(20);

  return Array.from({ length: 12 }, (_, i) => {
    const base = receitaLiquida?.meses[i] ?? 0;
    const percentual = (linha?: LinhaDreMatriz) => (base !== 0 && linha ? linha.meses[i] / base : 0);
    return {
      chave: NOMES_MES[i],
      mc: percentual(mc),
      margemBruta: percentual(lucroBruto),
      ebitda: percentual(ebitda),
      margemLiquida: percentual(lucroLiquido),
    };
  });
}

export type LinhaDreConfig = {
  id: string;
  ordem: number;
  rotulo: string;
  tipoCalc: TipoCalcLinhaDre;
  categorias: { id: string; nome: string }[];
};

export async function listarLinhasDreConfig(
  supabase: Cliente,
  params: { tenantId: string },
): Promise<LinhaDreConfig[]> {
  const { data } = await supabase
    .from("linhas_dre")
    .select("id, ordem, rotulo, tipo_calc, linha_dre_categorias(categorias_financeiras(id, nome))")
    .eq("tenant_id", params.tenantId)
    .order("ordem");

  return (data ?? []).map((l) => ({
    id: l.id,
    ordem: l.ordem,
    rotulo: l.rotulo,
    tipoCalc: l.tipo_calc,
    categorias: l.linha_dre_categorias.map((c) => c.categorias_financeiras).filter((c): c is { id: string; nome: string } => c !== null),
  }));
}

export async function criarLinhaDre(
  supabase: Cliente,
  params: { tenantId: string; rotulo: string; tipoCalc: TipoCalcLinhaDre },
): Promise<Resultado> {
  const rotulo = params.rotulo.trim();
  if (!rotulo) return { erro: "Informe um rótulo para a linha." };

  const { data: ultima } = await supabase
    .from("linhas_dre")
    .select("ordem")
    .eq("tenant_id", params.tenantId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("linhas_dre")
    .insert({ tenant_id: params.tenantId, rotulo, tipo_calc: params.tipoCalc, ordem: (ultima?.ordem ?? 0) + 1 });

  if (error) return { erro: error.message };
  return { sucesso: true };
}

export async function removerLinhaDre(supabase: Cliente, params: { tenantId: string; linhaId: string }): Promise<Resultado> {
  const { error } = await supabase.from("linhas_dre").delete().eq("id", params.linhaId).eq("tenant_id", params.tenantId);
  if (error) return { erro: error.message };
  return { sucesso: true };
}

// Reescreve a ordem de todas as linhas do tenant conforme a lista recebida
// (arrasta-e-solta na UI). Duas passagens: primeiro joga todo mundo pra
// ordem negativa (nunca colide com o intervalo positivo real nem entre si),
// depois grava a ordem final — evita violar a constraint unique(tenant_id,
// ordem) no meio do caminho, já que o cliente Supabase não expõe uma
// transação multi-statement pra isso.
export async function reordenarLinhasDre(
  supabase: Cliente,
  params: { tenantId: string; linhaIdsEmOrdem: string[] },
): Promise<Resultado> {
  for (let i = 0; i < params.linhaIdsEmOrdem.length; i++) {
    const { error } = await supabase
      .from("linhas_dre")
      .update({ ordem: -(i + 1) })
      .eq("id", params.linhaIdsEmOrdem[i])
      .eq("tenant_id", params.tenantId);
    if (error) return { erro: error.message };
  }
  for (let i = 0; i < params.linhaIdsEmOrdem.length; i++) {
    const { error } = await supabase
      .from("linhas_dre")
      .update({ ordem: i + 1 })
      .eq("id", params.linhaIdsEmOrdem[i])
      .eq("tenant_id", params.tenantId);
    if (error) return { erro: error.message };
  }
  return { sucesso: true };
}

export async function vincularCategoriaDre(
  supabase: Cliente,
  params: { tenantId: string; linhaId: string; categoriaId: string },
): Promise<Resultado> {
  // confirma posse da linha antes de inserir — linha_dre_categorias não
  // tem tenant_id próprio, a garantia real já é a policy RLS (EXISTS na
  // tabela pai), isso aqui só evita uma mensagem de erro genérica.
  const { data: linha } = await supabase
    .from("linhas_dre")
    .select("id")
    .eq("id", params.linhaId)
    .eq("tenant_id", params.tenantId)
    .maybeSingle();
  if (!linha) return { erro: "Linha de DRE não encontrada." };

  const { error } = await supabase.from("linha_dre_categorias").insert({ linha_dre_id: params.linhaId, categoria_id: params.categoriaId });
  if (error) return { erro: error.message };
  return { sucesso: true };
}

export async function desvincularCategoriaDre(
  supabase: Cliente,
  params: { linhaId: string; categoriaId: string },
): Promise<Resultado> {
  const { error } = await supabase
    .from("linha_dre_categorias")
    .delete()
    .eq("linha_dre_id", params.linhaId)
    .eq("categoria_id", params.categoriaId);
  if (error) return { erro: error.message };
  return { sucesso: true };
}

// As 23 linhas reais de tbTotalizadoresDRE (extraídas célula a célula da aba
// Est_DRE do arquivo de referência) — as 24 originais menos a linha 15
// "Receitas financeiras" (Tipo_Calc=0, fora do DRE). Ordem(ID) real
// preservada, inclusive o buraco na posição 15. Ponto de partida completo,
// não configuração final: nenhuma linha nasce com categoria vinculada aqui
// (esse vínculo é feito no provisionamento do tenant, que sabe quais
// categorias existem).
export const MODELO_COMPLETO_DRE: { ordem: number; rotulo: string; tipoCalc: TipoCalcLinhaDre; waterfallPapel: number | null; idDfc: IdDfcLinhaDre | null }[] = [
  { ordem: 1, rotulo: "Receitas operacionais", tipoCalc: "FOLHA", waterfallPapel: 1, idDfc: "OPERACIONAL_ENTRADA" },
  { ordem: 2, rotulo: "Devoluções", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "OPERACIONAL_SAIDA" },
  { ordem: 3, rotulo: "Tributos sobre a venda", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "OPERACIONAL_SAIDA" },
  { ordem: 4, rotulo: "Receita líquida", tipoCalc: "SUBTOTAL", waterfallPapel: 3, idDfc: null },
  { ordem: 5, rotulo: "Custos variáveis", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "OPERACIONAL_SAIDA" },
  { ordem: 6, rotulo: "Despesas variáveis", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "OPERACIONAL_SAIDA" },
  { ordem: 7, rotulo: "Margem de contribuição", tipoCalc: "SUBTOTAL", waterfallPapel: 3, idDfc: null },
  { ordem: 8, rotulo: "Lucro Bruto", tipoCalc: "SUBTOTAL_ALTERNATIVO", waterfallPapel: 3, idDfc: null },
  { ordem: 9, rotulo: "Custos fixos", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "OPERACIONAL_SAIDA" },
  { ordem: 10, rotulo: "Despesas fixas", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "OPERACIONAL_SAIDA" },
  { ordem: 11, rotulo: "EBITDA", tipoCalc: "SUBTOTAL", waterfallPapel: 3, idDfc: null },
  { ordem: 12, rotulo: "Depreciação e amortização", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: null },
  { ordem: 13, rotulo: "Lucro Operacional", tipoCalc: "SUBTOTAL", waterfallPapel: 3, idDfc: null },
  { ordem: 14, rotulo: "Receitas não operacionais", tipoCalc: "FOLHA", waterfallPapel: 4, idDfc: "NAO_OPERACIONAL_ENTRADA" },
  { ordem: 16, rotulo: "Despesas não operacionais", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "NAO_OPERACIONAL_SAIDA" },
  { ordem: 17, rotulo: "Resultado não operacional", tipoCalc: "RESULTADO_NAO_OPERACIONAL", waterfallPapel: 5, idDfc: null },
  { ordem: 18, rotulo: "Lucro antes dos impostos", tipoCalc: "SUBTOTAL", waterfallPapel: 3, idDfc: null },
  { ordem: 19, rotulo: "Tributos sobre o lucro", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "OPERACIONAL_SAIDA" },
  { ordem: 20, rotulo: "Lucro líquido", tipoCalc: "SUBTOTAL", waterfallPapel: 2, idDfc: null },
  { ordem: 21, rotulo: "Investimentos em Imobilizado", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: null },
  { ordem: 22, rotulo: "Empréstimos e Dívidas", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: null },
  { ordem: 23, rotulo: "Retirada de Lucros", tipoCalc: "FOLHA", waterfallPapel: 0, idDfc: "FINANCIAMENTO" },
  { ordem: 24, rotulo: "Lucro / Prejuízo Final", tipoCalc: "SUBTOTAL", waterfallPapel: 3, idDfc: null },
];

export async function aplicarModeloCompletoDre(supabase: Cliente, params: { tenantId: string }): Promise<Resultado> {
  const { error: erroLimpeza } = await supabase.from("linhas_dre").delete().eq("tenant_id", params.tenantId);
  if (erroLimpeza) return { erro: erroLimpeza.message };

  const { error } = await supabase.from("linhas_dre").insert(
    MODELO_COMPLETO_DRE.map((linha) => ({
      tenant_id: params.tenantId,
      ordem: linha.ordem,
      rotulo: linha.rotulo,
      tipo_calc: linha.tipoCalc,
      waterfall_papel: linha.waterfallPapel,
      id_dfc: linha.idDfc,
    })),
  );
  if (error) return { erro: error.message };
  return { sucesso: true };
}
