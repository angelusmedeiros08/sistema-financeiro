"use server";

import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { editarRegra, apagarRegra } from "@/lib/conciliacao/regras";

export async function editarRegraAction(regraId: string, params: { categoriaId: string; pessoaId: string | null }): Promise<{ erro?: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  return editarRegra(supabase, contexto.tenantId, regraId, params);
}

export async function apagarRegraAction(regraId: string): Promise<{ erro?: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  return apagarRegra(supabase, contexto.tenantId, regraId);
}
