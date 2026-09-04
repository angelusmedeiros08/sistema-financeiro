import type { Cliente, Regime } from "./regime";
import { buscarMovimento, valorComSinal } from "./regime";
import { montarHrefLancamentos } from "./drill-down";
import type { Database } from "@/utils/supabase/database.types";

type TipoCalcLinhaDre = Database["public"]["Enums"]["tipo_linha_dre"];
export type IdDfcLinhaDre = Database["public"]["Enums"]["id_dfc_linha_dre"];
type ConceitoFixoLinhaDre = Database["public"]["Enums"]["conceito_fixo_linha_dre"];
type Resultado = { sucesso: true } | { erro: string };

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type LinhaDreResultado = {
  id: string;
  ordem: number;
  rotulo: string;
  tipoCalc: TipoCalcLinhaDre;
  valorDireto: number;
  valorAcumulado: number;
  // null só em RESULTADO_NAO_OPERACIONAL (ver ehClicavel) — FOLHA e os
  // checkpoints acumulados (SUBTOTAL/SUBTOTAL_ALTERNATIVO) sempre têm link.
  href: string | null;
};

// FOLHA e os checkpoints acumulados (SUBTOTAL/SUBTOTAL_ALTERNATIVO — Margem
// de contribuição, Lucro Bruto, EBITDA etc.) viram link; só
// RESULTADO_NAO_OPERACIONAL fica de fora (soma um bloco reiniciado à parte,
// somaBlocoAtual em calcularCascata — semântica diferente de `acumulado`,
// resolver certo exigiria replicar aquele reset em categoriasDaLinhaDre
// também, e essa linha nem aparece na cascata pra justificar o esforço).
function ehClicavel(tipoCalc: TipoCalcLinhaDre): boolean {
  return tipoCalc === "FOLHA" || tipoCalc === "SUBTOTAL" || tipoCalc === "SUBTOTAL_ALTERNATIVO";
}

type LinhaComCategorias = {
  id: string;
  ordem: number;
  rotulo: string;
  tipo_calc: TipoCalcLinhaDre;
  conceito_fixo: ConceitoFixoLinhaDre | null;
  linha_dre_categorias: { categoria_id: string }[];
};

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
      .select("id, ordem, rotulo, tipo_calc, conceito_fixo, linha_dre_categorias(categoria_id)")
      .eq("tenant_id", params.tenantId)
      .order("ordem"),
    buscarMovimento(supabase, params),
  ]);
  return { linhas: (linhas ?? []) as LinhaComCategorias[], movimento };
}

export async function buscarDRE(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; dataInicio: string; dataFim: string; origemHref: string },
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
      href: ehClicavel(linha.tipo_calc)
        ? montarHrefLancamentos({
            tipoEntidade: "linha_dre",
            entidadeId: linha.id,
            regime: params.regime,
            periodoInicio: params.dataInicio,
            periodoFim: params.dataFim,
            origemHref: params.origemHref,
          })
        : null,
    };
  });
}

export type LinhaDreMatriz = {
  id: string;
  ordem: number;
  rotulo: string;
  tipoCalc: TipoCalcLinhaDre;
  conceitoFixo: ConceitoFixoLinhaDre | null;
  meses: number[];
  total: number;
  avPercentual: number;
  // null só em RESULTADO_NAO_OPERACIONAL — mesmo critério de ehClicavel em
  // LinhaDreResultado.href. Um href por mês (período daquele mês
  // específico) + um pro Total (ano inteiro).
  hrefsPorMes: (string | null)[];
  hrefTotal: string | null;
};

// Matriz Jan-Dez + Total + AV% — cada coluna (cada mês, e o total do ano) é
// uma cascata independente (calcularCascata rodada 13x), não uma soma das
// colunas mensais já processadas — pra uma linha SUBTOTAL isso faria
// diferença (soma de 12 acumulados mensais não é o acumulado do ano).
export async function buscarDREMatriz(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; ano: number; origemHref: string },
): Promise<LinhaDreMatriz[]> {
  const dataInicio = `${params.ano}-01-01`;
  const dataFim = `${params.ano}-12-31`;
  // Limites de cada mês do ano selecionado — dia 0 do mês seguinte (UTC) é
  // o último dia do mês corrente, mesmo truque já usado em
  // buscarResumoVencimentos (aging.ts).
  const limitesDoMes = Array.from({ length: 12 }, (_, i) => ({
    inicio: `${params.ano}-${String(i + 1).padStart(2, "0")}-01`,
    fim: new Date(Date.UTC(params.ano, i + 1, 0)).toISOString().slice(0, 10),
  }));
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

  // Achada pelo papel semântico da linha (conceito_fixo), nunca por
  // posição (linhas[0]) — `ordem` é livremente reescrita pelas setas ↑/↓
  // de Configurações → Estrutura de DRE, então "a linha de menor ordem"
  // deixa de ser Receitas operacionais assim que o usuário reordena
  // qualquer coisa pra posição 1, invertendo os sinais de toda a coluna
  // AV% em silêncio (achado em revisão de código).
  const linhaReceitaOperacional = linhas.find((l) => l.conceito_fixo === "RECEITA_OPERACIONAL");
  const totalReceitasOperacionais = linhaReceitaOperacional ? (colunaTotal.get(linhaReceitaOperacional.id) ?? 0) : 0;

  return linhas.map((linha) => {
    const total = colunaTotal.get(linha.id) ?? 0;
    const clicavel = ehClicavel(linha.tipo_calc);
    const hrefPara = (periodoInicio: string, periodoFim: string) =>
      montarHrefLancamentos({
        tipoEntidade: "linha_dre",
        entidadeId: linha.id,
        regime: params.regime,
        periodoInicio,
        periodoFim,
        origemHref: params.origemHref,
      });
    return {
      id: linha.id,
      ordem: linha.ordem,
      rotulo: linha.rotulo,
      tipoCalc: linha.tipo_calc,
      conceitoFixo: linha.conceito_fixo,
      meses: colunasMensais.map((c) => c.get(linha.id) ?? 0),
      total,
      avPercentual: totalReceitasOperacionais !== 0 ? total / totalReceitasOperacionais : 0,
      hrefsPorMes: clicavel ? limitesDoMes.map((m) => hrefPara(m.inicio, m.fim)) : new Array(12).fill(null),
      hrefTotal: clicavel ? hrefPara(dataInicio, dataFim) : null,
    };
  });
}

export type IndicadorMensal = { chave: string; mc: number; margemBruta: number; ebitda: number; margemLiquida: number };

// Indicadores mensais — todos derivados de linhas que já existem na matriz
// (achadas pelo papel semântico conceito_fixo, nunca por posição de
// `ordem` — essa é livremente reescrita pelas setas ↑/↓ de Configurações →
// Estrutura de DRE, então uma posição fixa como "ordem 11 = EBITDA"
// rotulava um valor errado sob o rótulo certo assim que o usuário
// reordenava qualquer linha, sem erro nenhum — achado em revisão de
// código), nenhum cálculo novo inventado.
export async function buscarDREIndicadores(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; ano: number },
): Promise<IndicadorMensal[]> {
  // origemHref não é lido por IndicadoresDreChart (só mc/margemBruta/
  // ebitda/margemLiquida) — passado vazio de propósito, não desperdiça
  // uma URL real que ninguém usa.
  const matriz = await buscarDREMatriz(supabase, { ...params, origemHref: "" });
  const porConceito = new Map(matriz.filter((l) => l.conceitoFixo).map((l) => [l.conceitoFixo, l]));
  const receitaLiquida = porConceito.get("RECEITA_LIQUIDA");
  const mc = porConceito.get("MARGEM_CONTRIBUICAO");
  const lucroBruto = porConceito.get("LUCRO_BRUTO");
  const ebitda = porConceito.get("EBITDA");
  const lucroLiquido = porConceito.get("LUCRO_LIQUIDO");

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
  idDfc: IdDfcLinhaDre | null;
  categorias: { id: string; nome: string }[];
};

export async function listarLinhasDreConfig(
  supabase: Cliente,
  params: { tenantId: string },
): Promise<LinhaDreConfig[]> {
  const { data } = await supabase
    .from("linhas_dre")
    .select("id, ordem, rotulo, tipo_calc, id_dfc, linha_dre_categorias(categorias_financeiras(id, nome))")
    .eq("tenant_id", params.tenantId)
    .order("ordem");

  return (data ?? []).map((l) => ({
    id: l.id,
    ordem: l.ordem,
    rotulo: l.rotulo,
    tipoCalc: l.tipo_calc,
    idDfc: l.id_dfc,
    categorias: l.linha_dre_categorias.map((c) => c.categorias_financeiras).filter((c): c is { id: string; nome: string } => c !== null),
  }));
}

export async function criarLinhaDre(
  supabase: Cliente,
  params: { tenantId: string; rotulo: string; tipoCalc: TipoCalcLinhaDre; idDfc?: IdDfcLinhaDre | null },
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
    .insert({ tenant_id: params.tenantId, rotulo, tipo_calc: params.tipoCalc, id_dfc: params.idDfc ?? null, ordem: (ultima?.ordem ?? 0) + 1 });

  if (error) return { erro: error.message };
  return { sucesso: true };
}

// id_dfc é só uma tag de classificação pro relatório de DFC — não entra na
// cascata de cálculo da DRE, então não há risco em deixar reclassificar
// qualquer linha (padrão ou customizada), diferente de tipo_calc/rotulo das
// linhas padrão (essas continuam fixas pelo modelo).
export async function editarIdDfcLinhaDre(
  supabase: Cliente,
  params: { tenantId: string; linhaId: string; idDfc: IdDfcLinhaDre | null },
): Promise<Resultado> {
  const { error } = await supabase
    .from("linhas_dre")
    .update({ id_dfc: params.idDfc })
    .eq("id", params.linhaId)
    .eq("tenant_id", params.tenantId);

  if (error) return { erro: error.message };
  return { sucesso: true };
}

export async function removerLinhaDre(supabase: Cliente, params: { tenantId: string; linhaId: string }): Promise<Resultado> {
  // Linha com conceito_fixo é uma das 6 que buscarDREMatriz/
  // buscarDREIndicadores acham pelo papel semântico (Receita líquida,
  // Margem de contribuição, EBITDA...) — excluir uma delas quebra AV% ou
  // um indicador inteiro (some do gráfico, sem erro nenhum), então fica
  // fora do que pode ser removido pela tela (achado em revisão de código,
  // mesmo raciocínio da correção de conceito_fixo).
  const { data: linha } = await supabase.from("linhas_dre").select("conceito_fixo").eq("id", params.linhaId).eq("tenant_id", params.tenantId).maybeSingle();
  if (linha?.conceito_fixo) return { erro: "Esta linha faz parte do cálculo de indicadores e não pode ser removida." };

  const { error } = await supabase.from("linhas_dre").delete().eq("id", params.linhaId).eq("tenant_id", params.tenantId);
  if (error) return { erro: error.message };
  return { sucesso: true };
}

// Reescreve a ordem de todas as linhas do tenant conforme a lista recebida
// (arrasta-e-solta na UI). RPC atômica (achado em varredura de melhorias —
// antes eram duas passagens de updates via chamadas PostgREST separadas,
// sem transação entre elas; uma falha no meio deixava `ordem` inconsistente
// sem rollback nem aviso). A função faz as duas passagens (ordem negativa
// temporária, depois final — evita violar a constraint unique(tenant_id,
// ordem) no meio do caminho) dentro de uma única transação de banco.
export async function reordenarLinhasDre(
  supabase: Cliente,
  params: { tenantId: string; linhaIdsEmOrdem: string[] },
): Promise<Resultado> {
  const { error } = await supabase.rpc("reordenar_linhas_dre", {
    p_tenant_id: params.tenantId,
    p_linha_ids: params.linhaIdsEmOrdem,
  });
  if (error) return { erro: error.message };
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
  params: { tenantId: string; linhaId: string; categoriaId: string },
): Promise<Resultado> {
  // mesma defesa em profundidade de vincularCategoriaDre — confirma posse
  // da linha antes de apagar, não confia só na policy RLS.
  const { data: linha } = await supabase
    .from("linhas_dre")
    .select("id")
    .eq("id", params.linhaId)
    .eq("tenant_id", params.tenantId)
    .maybeSingle();
  if (!linha) return { erro: "Linha de DRE não encontrada." };

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
export const MODELO_COMPLETO_DRE: {
  ordem: number;
  rotulo: string;
  tipoCalc: TipoCalcLinhaDre;
  waterfallPapel: number | null;
  idDfc: IdDfcLinhaDre | null;
  conceitoFixo: ConceitoFixoLinhaDre | null;
}[] = [
  { ordem: 1, rotulo: "Receitas operacionais", tipoCalc: "FOLHA", waterfallPapel: 1, idDfc: "OPERACIONAL_ENTRADA", conceitoFixo: "RECEITA_OPERACIONAL" },
  { ordem: 2, rotulo: "Devoluções", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "OPERACIONAL_SAIDA", conceitoFixo: null },
  { ordem: 3, rotulo: "Tributos sobre a venda", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "OPERACIONAL_SAIDA", conceitoFixo: null },
  { ordem: 4, rotulo: "Receita líquida", tipoCalc: "SUBTOTAL", waterfallPapel: 3, idDfc: null, conceitoFixo: "RECEITA_LIQUIDA" },
  { ordem: 5, rotulo: "Custos variáveis", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "OPERACIONAL_SAIDA", conceitoFixo: null },
  { ordem: 6, rotulo: "Despesas variáveis", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "OPERACIONAL_SAIDA", conceitoFixo: null },
  { ordem: 7, rotulo: "Margem de contribuição", tipoCalc: "SUBTOTAL", waterfallPapel: 3, idDfc: null, conceitoFixo: "MARGEM_CONTRIBUICAO" },
  { ordem: 8, rotulo: "Lucro Bruto", tipoCalc: "SUBTOTAL_ALTERNATIVO", waterfallPapel: 3, idDfc: null, conceitoFixo: "LUCRO_BRUTO" },
  { ordem: 9, rotulo: "Custos fixos", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "OPERACIONAL_SAIDA", conceitoFixo: null },
  { ordem: 10, rotulo: "Despesas fixas", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "OPERACIONAL_SAIDA", conceitoFixo: null },
  { ordem: 11, rotulo: "EBITDA", tipoCalc: "SUBTOTAL", waterfallPapel: 3, idDfc: null, conceitoFixo: "EBITDA" },
  { ordem: 12, rotulo: "Depreciação e amortização", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: null, conceitoFixo: null },
  { ordem: 13, rotulo: "Lucro Operacional", tipoCalc: "SUBTOTAL", waterfallPapel: 3, idDfc: null, conceitoFixo: null },
  { ordem: 14, rotulo: "Receitas não operacionais", tipoCalc: "FOLHA", waterfallPapel: 4, idDfc: "NAO_OPERACIONAL_ENTRADA", conceitoFixo: null },
  { ordem: 16, rotulo: "Despesas não operacionais", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "NAO_OPERACIONAL_SAIDA", conceitoFixo: null },
  { ordem: 17, rotulo: "Resultado não operacional", tipoCalc: "RESULTADO_NAO_OPERACIONAL", waterfallPapel: 5, idDfc: null, conceitoFixo: null },
  { ordem: 18, rotulo: "Lucro antes dos impostos", tipoCalc: "SUBTOTAL", waterfallPapel: 3, idDfc: null, conceitoFixo: null },
  { ordem: 19, rotulo: "Tributos sobre o lucro", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "OPERACIONAL_SAIDA", conceitoFixo: null },
  { ordem: 20, rotulo: "Lucro líquido", tipoCalc: "SUBTOTAL", waterfallPapel: 2, idDfc: null, conceitoFixo: "LUCRO_LIQUIDO" },
  { ordem: 21, rotulo: "Investimentos em Imobilizado", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "INVESTIMENTO", conceitoFixo: null },
  { ordem: 22, rotulo: "Empréstimos e Dívidas", tipoCalc: "FOLHA", waterfallPapel: 2, idDfc: "FINANCIAMENTO", conceitoFixo: null },
  { ordem: 23, rotulo: "Retirada de Lucros", tipoCalc: "FOLHA", waterfallPapel: 0, idDfc: "FINANCIAMENTO", conceitoFixo: null },
  { ordem: 24, rotulo: "Lucro / Prejuízo Final", tipoCalc: "SUBTOTAL", waterfallPapel: 3, idDfc: null, conceitoFixo: null },
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
      conceito_fixo: linha.conceitoFixo,
    })),
  );
  if (error) return { erro: error.message };
  return { sucesso: true };
}
