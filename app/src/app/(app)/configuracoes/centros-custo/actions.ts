"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";

type ResultadoAcao = { erro: string } | { sucesso: true };

export async function criarCentroCusto(formData: FormData): Promise<ResultadoAcao> {
  const nome = String(formData.get("nome") ?? "").trim();
  const codigo = String(formData.get("codigo") ?? "").trim();

  if (!nome) {
    return { erro: "Informe o nome do centro de custo." };
  }

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const { error } = await supabase.from("centros_custo").insert({
    tenant_id: contexto.tenantId,
    nome,
    codigo: codigo || null,
  });

  if (error) return { erro: error.message };

  revalidatePath("/configuracoes/centros-custo");
  return { sucesso: true };
}

export async function alternarAtivoCentroCusto(centroCustoId: string, ativo: boolean): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const { error } = await supabase
    .from("centros_custo")
    .update({ ativo })
    .eq("id", centroCustoId)
    .eq("tenant_id", contexto.tenantId);

  if (error) return { erro: error.message };

  revalidatePath("/configuracoes/centros-custo");
  return { sucesso: true };
}
