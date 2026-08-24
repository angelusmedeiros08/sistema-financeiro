"use server";

import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { apagarRegraMapeamento } from "@/lib/importacao/regras-mapeamento";

export async function apagarRegraMapeamentoAction(regraId: string): Promise<{ erro?: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  return apagarRegraMapeamento(supabase, contexto.tenantId, regraId);
}
