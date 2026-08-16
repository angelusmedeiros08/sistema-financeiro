"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { commitarLinhaPessoa, type ParametrosCommitLinhaPessoa } from "@/lib/pessoas/importacao/commit";

export type ParametrosImportarLinhaPessoa = Omit<ParametrosCommitLinhaPessoa, "tenant_id">;

export async function importarLinhaPessoaAction(params: ParametrosImportarLinhaPessoa): Promise<{ pessoa_id: string } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  return commitarLinhaPessoa(supabase, { ...params, tenant_id: contexto.tenantId });
}

export async function revalidarPosImportacaoPessoasAction(): Promise<void> {
  revalidatePath("/clientes");
  revalidatePath("/fornecedores");
}
