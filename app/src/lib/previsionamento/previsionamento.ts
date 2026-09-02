import type { Cliente, Regime } from "@/lib/relatorios/regime";
import { buscarMovimento } from "@/lib/relatorios/regime";
import { montarHrefLancamentos } from "@/lib/relatorios/drill-down";
import type { Database } from "@/utils/supabase/database.types";

type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];
type Resultado = { erro: string } | { sucesso: true };

export type CelulaPrevisionamento = { mes: number; valorPrevisto: number };
export type LinhaGradePrevisionamento = {
  categoriaId: string;
  categoriaNome: string;
  tipo: TipoCategoria;
  celulas: CelulaPrevisionamento[];
};

function competenciaDoMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

// Grade categoria × 12 meses do ano — toda categoria do tenant aparece,
// mesmo sem meta cadastrada ainda (célula fica 0), pra grade de cadastro
// nunca esconder onde falta preencher.
//
// Tabela do banco continua se chamando `orcamentos` — renomear a tabela em
// si (com FKs, policies de RLS referenciando o nome) é uma mudança de
// schema maior, sem benefício visível pra quem usa o sistema; só a camada
// de aplicação (rotas, rótulos, nomes de função/tipo) virou "Previsionamento".
export async function buscarGradePrevisionamento(
  supabase: Cliente,
  params: { tenantId: string; ano: number },
): Promise<LinhaGradePrevisionamento[]> {
  const [{ data: categorias }, { data: metas }] = await Promise.all([
    supabase.from("categorias_financeiras").select("id, nome, tipo").eq("tenant_id", params.tenantId).order("nome"),
    supabase
      .from("orcamentos")
      .select("categoria_id, competencia, valor_previsto")
      .eq("tenant_id", params.tenantId)
      .gte("competencia", competenciaDoMes(params.ano, 1))
      .lte("competencia", competenciaDoMes(params.ano, 12)),
  ]);

  const valorPorCategoriaEMes = new Map<string, number>();
  for (const meta of metas ?? []) {
    const mes = Number(meta.competencia.slice(5, 7));
    valorPorCategoriaEMes.set(`${meta.categoria_id}:${mes}`, Number(meta.valor_previsto));
  }

  return (categorias ?? []).map((categoria) => ({
    categoriaId: categoria.id,
    categoriaNome: categoria.nome,
    tipo: categoria.tipo,
    celulas: Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      return { mes, valorPrevisto: valorPorCategoriaEMes.get(`${categoria.id}:${mes}`) ?? 0 };
    }),
  }));
}

export async function definirValorPrevisionamento(
  supabase: Cliente,
  params: { tenantId: string; categoriaId: string; ano: number; mes: number; valorPrevisto: number; criadoPor: string },
): Promise<Resultado> {
  if (!Number.isFinite(params.valorPrevisto) || params.valorPrevisto < 0) {
    return { erro: "Valor previsto inválido." };
  }

  const { error } = await supabase.from("orcamentos").upsert(
    {
      tenant_id: params.tenantId,
      categoria_id: params.categoriaId,
      competencia: competenciaDoMes(params.ano, params.mes),
      valor_previsto: params.valorPrevisto,
      criado_por: params.criadoPor,
    },
    { onConflict: "tenant_id,categoria_id,competencia" },
  );

  if (error) return { erro: error.message };
  return { sucesso: true };
}

// Propaga o valor de um mês pros meses seguintes do mesmo ano (ex.: Jan →
// Fev–Dez) — resolve o caso comum de meta constante sem preencher célula
// por célula. Sobrescreve sem perguntar: a confirmação de "isso vai
// sobrescrever meses já preenchidos" é responsabilidade da UI, antes de
// chamar esta função.
export async function copiarValorParaRestoDoAno(
  supabase: Cliente,
  params: { tenantId: string; categoriaId: string; ano: number; mesOrigem: number; valorPrevisto: number; criadoPor: string },
): Promise<Resultado> {
  if (!Number.isFinite(params.valorPrevisto) || params.valorPrevisto < 0) {
    return { erro: "Valor previsto inválido." };
  }
  if (params.mesOrigem >= 12) return { sucesso: true };

  const linhas = Array.from({ length: 12 - params.mesOrigem }, (_, i) => ({
    tenant_id: params.tenantId,
    categoria_id: params.categoriaId,
    competencia: competenciaDoMes(params.ano, params.mesOrigem + 1 + i),
    valor_previsto: params.valorPrevisto,
    criado_por: params.criadoPor,
  }));

  const { error } = await supabase.from("orcamentos").upsert(linhas, { onConflict: "tenant_id,categoria_id,competencia" });
  if (error) return { erro: error.message };
  return { sucesso: true };
}

export type LinhaPrevistoRealizado = {
  categoriaId: string;
  categoriaNome: string;
  tipo: TipoCategoria;
  meses: { mes: number; previsto: number; realizado: number }[];
  totalPrevisto: number;
  totalRealizado: number;
  // null = sem meta cadastrada (totalPrevisto = 0), não dá pra calcular
  // desvio — nunca confundir com "0% de desvio de verdade" (achado em
  // auditoria de UX: caía em 0 antes, indistinguível de "dentro do
  // orçamento" quando na real não havia orçamento nenhum definido).
  desvioPercentual: number | null;
  // Só o Realizado tem link — Previsto é meta cadastrada à mão (tabela
  // orcamentos), não existe lançamento nenhum por trás pra mostrar.
  hrefRealizado: string;
};

// Casa a meta (orcamentos) contra o movimento já realizado no mesmo
// período, reaproveitando buscarMovimento em vez de duplicar leitura —
// mesmo dataset de todo relatório (Seção 6.1 do mapeamento). Desvio
// positivo é sempre "gastou/recebeu mais do que devia" na direção ruim
// pra despesa e boa pra receita — a UI decide a cor conforme o tipo.
export async function buscarPrevistoRealizado(
  supabase: Cliente,
  params: { tenantId: string; ano: number; regime: Regime; origemHref: string },
): Promise<LinhaPrevistoRealizado[]> {
  const dataInicio = competenciaDoMes(params.ano, 1);
  const dataFim = `${params.ano}-12-31`;

  const [grade, movimento] = await Promise.all([
    buscarGradePrevisionamento(supabase, { tenantId: params.tenantId, ano: params.ano }),
    buscarMovimento(supabase, { tenantId: params.tenantId, regime: params.regime, dataInicio, dataFim }),
  ]);

  const realizadoPorCategoriaEMes = new Map<string, number>();
  for (const linha of movimento) {
    if (!linha.categoriaId) continue;
    const mes = Number(linha.data.slice(5, 7));
    const chave = `${linha.categoriaId}:${mes}`;
    realizadoPorCategoriaEMes.set(chave, (realizadoPorCategoriaEMes.get(chave) ?? 0) + linha.valor);
  }

  return grade
    .map((linha) => {
      const meses = linha.celulas.map((celula) => ({
        mes: celula.mes,
        previsto: celula.valorPrevisto,
        realizado: realizadoPorCategoriaEMes.get(`${linha.categoriaId}:${celula.mes}`) ?? 0,
      }));
      const totalPrevisto = meses.reduce((soma, m) => soma + m.previsto, 0);
      const totalRealizado = meses.reduce((soma, m) => soma + m.realizado, 0);
      return {
        categoriaId: linha.categoriaId,
        categoriaNome: linha.categoriaNome,
        tipo: linha.tipo,
        meses,
        totalPrevisto,
        totalRealizado,
        desvioPercentual: totalPrevisto > 0 ? (totalRealizado - totalPrevisto) / totalPrevisto : null,
        hrefRealizado: montarHrefLancamentos({
          tipoEntidade: "categoria",
          entidadeId: linha.categoriaId,
          regime: params.regime,
          periodoInicio: dataInicio,
          periodoFim: dataFim,
          origemHref: params.origemHref,
        }),
      };
    })
    .filter((linha) => linha.totalPrevisto > 0 || linha.totalRealizado > 0);
}
