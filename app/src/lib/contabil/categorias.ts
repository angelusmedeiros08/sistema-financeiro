import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";

type Cliente = SupabaseClient<Database>;
type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];
type Resultado = { erro: string } | { sucesso: true };

export type Categoria = {
  id: string;
  nome: string;
  tipo: TipoCategoria;
  ehCustoFixo: boolean;
  contaContabilId: string | null;
  contaContabilNome: string | null;
  categoriaPaiId: string | null;
};

// Lista achatada, ordenada categoria-pai antes de suas subcategorias — a UI
// decide a indentação a partir de categoriaPaiId, mesma lógica de
// listarPlanoDeContas().
export async function listarCategorias(supabase: Cliente, params: { tenantId: string; tipo: TipoCategoria }): Promise<Categoria[]> {
  const { data } = await supabase
    .from("categorias_financeiras")
    .select("id, nome, tipo, eh_custo_fixo, categoria_pai_id, conta_contabil_id, contas_contabeis(nome)")
    .eq("tenant_id", params.tenantId)
    .eq("tipo", params.tipo)
    .order("nome");

  const categorias = (data ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    ehCustoFixo: c.eh_custo_fixo,
    contaContabilId: c.conta_contabil_id,
    contaContabilNome: c.contas_contabeis?.nome ?? null,
    categoriaPaiId: c.categoria_pai_id,
  }));

  // pais antes dos filhos, mas preserva ordem alfabética dentro de cada nível
  const raizes = categorias.filter((c) => !c.categoriaPaiId);
  const porPai = new Map<string, Categoria[]>();
  for (const c of categorias) {
    if (!c.categoriaPaiId) continue;
    porPai.set(c.categoriaPaiId, [...(porPai.get(c.categoriaPaiId) ?? []), c]);
  }
  const resultado: Categoria[] = [];
  for (const raiz of raizes) {
    resultado.push(raiz);
    resultado.push(...(porPai.get(raiz.id) ?? []));
  }
  return resultado;
}

// Achado em auditoria de segurança (08/09/2026): nem criarCategoria nem
// editarCategoria checavam que conta_contabil_id/categoria_pai_id
// pertencem a este tenant — mesmo padrão de referência cruzada não
// validada já corrigido em Vendas/Orçamentos e linha_dre_categorias.
async function confirmarPosseContaContabil(supabase: Cliente, tenantId: string, contaContabilId: string): Promise<boolean> {
  const { data } = await supabase.from("contas_contabeis").select("id").eq("id", contaContabilId).eq("tenant_id", tenantId).maybeSingle();
  return !!data;
}
async function confirmarPosseCategoria(supabase: Cliente, tenantId: string, categoriaId: string): Promise<boolean> {
  const { data } = await supabase.from("categorias_financeiras").select("id").eq("id", categoriaId).eq("tenant_id", tenantId).maybeSingle();
  return !!data;
}

export async function criarCategoria(
  supabase: Cliente,
  params: {
    tenantId: string;
    nome: string;
    tipo: TipoCategoria;
    contaContabilId: string;
    categoriaPaiId?: string | null;
    ehCustoFixo?: boolean;
  },
): Promise<{ id: string } | { erro: string }> {
  if (!params.nome.trim()) return { erro: "Informe o nome da categoria." };
  if (!params.contaContabilId) return { erro: "Selecione a conta contábil." };
  if (!(await confirmarPosseContaContabil(supabase, params.tenantId, params.contaContabilId))) {
    return { erro: "Conta contábil inválida para este tenant." };
  }
  if (params.categoriaPaiId && !(await confirmarPosseCategoria(supabase, params.tenantId, params.categoriaPaiId))) {
    return { erro: "Categoria pai inválida para este tenant." };
  }

  const { data, error } = await supabase
    .from("categorias_financeiras")
    .insert({
      tenant_id: params.tenantId,
      nome: params.nome.trim(),
      tipo: params.tipo,
      conta_contabil_id: params.contaContabilId,
      categoria_pai_id: params.categoriaPaiId || null,
      eh_custo_fixo: params.ehCustoFixo ?? false,
    })
    .select("id")
    .single();

  if (error || !data) return { erro: error?.message ?? "Falha ao criar categoria." };
  return { id: data.id };
}

export async function editarCategoria(
  supabase: Cliente,
  params: {
    tenantId: string;
    categoriaId: string;
    nome: string;
    contaContabilId: string;
    categoriaPaiId?: string | null;
    ehCustoFixo?: boolean;
  },
): Promise<Resultado> {
  if (!params.nome.trim()) return { erro: "Informe o nome da categoria." };
  if (!params.contaContabilId) return { erro: "Selecione a conta contábil." };
  if (params.categoriaPaiId === params.categoriaId) return { erro: "Uma categoria não pode ser subcategoria dela mesma." };
  if (!(await confirmarPosseContaContabil(supabase, params.tenantId, params.contaContabilId))) {
    return { erro: "Conta contábil inválida para este tenant." };
  }
  if (params.categoriaPaiId && !(await confirmarPosseCategoria(supabase, params.tenantId, params.categoriaPaiId))) {
    return { erro: "Categoria pai inválida para este tenant." };
  }

  const { error } = await supabase
    .from("categorias_financeiras")
    .update({
      nome: params.nome.trim(),
      conta_contabil_id: params.contaContabilId,
      categoria_pai_id: params.categoriaPaiId || null,
      eh_custo_fixo: params.ehCustoFixo ?? false,
    })
    .eq("id", params.categoriaId)
    .eq("tenant_id", params.tenantId);

  if (error) return { erro: error.message };
  return { sucesso: true };
}
