import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { normalizarTexto } from "@/lib/importacao/locale-br";

type Cliente = SupabaseClient<Database>;

export type RegraCategorizacao = {
  id: string;
  descricaoNormalizada: string;
  categoriaId: string;
  categoriaNome: string;
  pessoaId: string | null;
  pessoaNome: string | null;
  origem: Database["public"]["Enums"]["origem_regra_categorizacao"];
  criadoEm: string;
};

export async function buscarRegraPorDescricao(supabase: Cliente, tenantId: string, descricaoBanco: string): Promise<{ categoriaId: string; pessoaId: string | null } | null> {
  const descricaoNormalizada = normalizarTexto(descricaoBanco);
  if (!descricaoNormalizada) return null;

  const { data } = await supabase
    .from("regras_categorizacao")
    .select("categoria_id, pessoa_id")
    .eq("tenant_id", tenantId)
    .eq("descricao_normalizada", descricaoNormalizada)
    .maybeSingle();

  return data ? { categoriaId: data.categoria_id, pessoaId: data.pessoa_id } : null;
}

// Chamado depois de confirmar a criação de um lançamento simplificado na
// conciliação — nasce sozinha (origem HISTORICO), sem nenhuma tela extra
// pro caso comum. Mesmo modelo da Nibo: regra implícita a partir da
// primeira correção manual, mais barata e mais segura que exigir autoria
// explícita. Nunca sobrescreve uma regra já existente pra essa descrição.
export async function criarRegraSeNaoExiste(supabase: Cliente, params: { tenantId: string; descricaoBanco: string; categoriaId: string; pessoaId: string | null }): Promise<void> {
  const descricaoNormalizada = normalizarTexto(params.descricaoBanco);
  if (!descricaoNormalizada) return;

  const existente = await buscarRegraPorDescricao(supabase, params.tenantId, params.descricaoBanco);
  if (existente) return;

  await supabase.from("regras_categorizacao").insert({
    tenant_id: params.tenantId,
    descricao_normalizada: descricaoNormalizada,
    categoria_id: params.categoriaId,
    pessoa_id: params.pessoaId,
    origem: "HISTORICO",
  });
}

export async function listarRegras(supabase: Cliente, tenantId: string): Promise<RegraCategorizacao[]> {
  const { data } = await supabase
    .from("regras_categorizacao")
    .select("id, descricao_normalizada, categoria_id, pessoa_id, origem, criado_em, categorias_financeiras(nome), pessoas(nome)")
    .eq("tenant_id", tenantId)
    .order("criado_em", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    descricaoNormalizada: r.descricao_normalizada,
    categoriaId: r.categoria_id,
    categoriaNome: r.categorias_financeiras?.nome ?? "",
    pessoaId: r.pessoa_id,
    pessoaNome: r.pessoas?.nome ?? null,
    origem: r.origem,
    criadoEm: r.criado_em,
  }));
}

export async function editarRegra(supabase: Cliente, tenantId: string, regraId: string, params: { categoriaId: string; pessoaId: string | null }): Promise<{ erro?: string }> {
  const { error } = await supabase
    .from("regras_categorizacao")
    .update({ categoria_id: params.categoriaId, pessoa_id: params.pessoaId })
    .eq("id", regraId)
    .eq("tenant_id", tenantId);
  return error ? { erro: error.message } : {};
}

export async function apagarRegra(supabase: Cliente, tenantId: string, regraId: string): Promise<{ erro?: string }> {
  const { error } = await supabase.from("regras_categorizacao").delete().eq("id", regraId).eq("tenant_id", tenantId);
  return error ? { erro: error.message } : {};
}
