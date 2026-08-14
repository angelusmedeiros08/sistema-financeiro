"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { criarCategoria, editarCategoria } from "./categorias";
import type { Database } from "@/utils/supabase/database.types";

type ResultadoAcao = { erro: string } | { sucesso: true };
type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];

export async function criarCategoriaAction(formData: FormData): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await criarCategoria(supabase, {
    tenantId: contexto.tenantId,
    nome: String(formData.get("nome") ?? ""),
    tipo: String(formData.get("tipo") ?? "") as TipoCategoria,
    contaContabilId: String(formData.get("conta_contabil_id") ?? ""),
    categoriaPaiId: String(formData.get("categoria_pai_id") ?? "") || null,
    ehCustoFixo: formData.get("eh_custo_fixo") === "on",
  });

  if ("erro" in resultado) return resultado;
  revalidatePath("/configuracoes/categorias");
  return { sucesso: true };
}

export async function editarCategoriaAction(formData: FormData): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await editarCategoria(supabase, {
    tenantId: contexto.tenantId,
    categoriaId: String(formData.get("categoria_id") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    contaContabilId: String(formData.get("conta_contabil_id") ?? ""),
    categoriaPaiId: String(formData.get("categoria_pai_id") ?? "") || null,
    ehCustoFixo: formData.get("eh_custo_fixo") === "on",
  });

  if ("erro" in resultado) return resultado;
  revalidatePath("/configuracoes/categorias");
  return { sucesso: true };
}
