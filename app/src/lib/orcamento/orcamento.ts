import type { Cliente, Regime } from "@/lib/relatorios/regime";
import { buscarMovimento } from "@/lib/relatorios/regime";
import type { Database } from "@/utils/supabase/database.types";

type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];
type Resultado = { erro: string } | { sucesso: true };

export type CelulaOrcamento = { mes: number; valorPrevisto: number };
export type LinhaGradeOrcamento = {
  categoriaId: string;
  categoriaNome: string;
  tipo: TipoCategoria;
  celulas: CelulaOrcamento[];
};

function competenciaDoMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

// Grade categoria × 12 meses do ano — toda categoria do tenant aparece,
// mesmo sem meta cadastrada ainda (célula fica 0), pra grade de cadastro
// nunca esconder onde falta preencher.
export async function buscarGradeOrcamento(
  supabase: Cliente,
  params: { tenantId: string; ano: number },
): Promise<LinhaGradeOrcamento[]> {
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

export async function definirValorOrcamento(
  supabase: Cliente,
  params: { tenantId: string; categoriaId: string; ano: number; mes: number; valorPrevisto: number; criadoPor: string },
): Promise<Resultado> {
  if (!Number.isFinite(params.valorPrevisto) || params.valorPrevisto < 0) {
    return { erro: "Valor de orçamento inválido." };
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
    return { erro: "Valor de orçamento inválido." };
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

export type LinhaOrcadoRealizado = {
  categoriaId: string;
  categoriaNome: string;
  tipo: TipoCategoria;
  meses: { mes: number; previsto: number; realizado: number }[];
  totalPrevisto: number;
  totalRealizado: number;
  desvioPercentual: number;
};

// Casa a meta (orcamentos) contra o movimento já realizado no mesmo
// período, reaproveitando buscarMovimento em vez de duplicar leitura —
// mesmo dataset de todo relatório (Seção 6.1 do mapeamento). Desvio
// positivo é sempre "gastou/recebeu mais do que devia" na direção ruim
// pra despesa e boa pra receita — a UI decide a cor conforme o tipo.
export async function buscarOrcadoRealizado(
  supabase: Cliente,
  params: { tenantId: string; ano: number; regime: Regime },
): Promise<LinhaOrcadoRealizado[]> {
  const [grade, movimento] = await Promise.all([
    buscarGradeOrcamento(supabase, { tenantId: params.tenantId, ano: params.ano }),
    buscarMovimento(supabase, {
      tenantId: params.tenantId,
      regime: params.regime,
      dataInicio: competenciaDoMes(params.ano, 1),
      dataFim: `${params.ano}-12-31`,
    }),
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
        desvioPercentual: totalPrevisto > 0 ? (totalRealizado - totalPrevisto) / totalPrevisto : 0,
      };
    })
    .filter((linha) => linha.totalPrevisto > 0 || linha.totalRealizado > 0);
}
