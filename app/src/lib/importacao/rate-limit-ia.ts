import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";

// Mesmo padrão de lib/chat-ia/rate-limit.ts (tabela no Postgres, só
// service_role, sempre registra mesmo negando, janela deslizante por
// tenant_id) — achado real em auditoria: extrairLancamentosIAAction só
// verificava se o usuário estava autenticado, sem nenhum teto de uso. Cada
// chamada custa pouco (~R$0,03-0,04), mas sem limite um loop de frontend ou
// uso indevido de um único tenant não tem freio nenhum.
const JANELA_MS = 24 * 60 * 60 * 1000;
const LIMITE_USOS_POR_TENANT_NA_JANELA = 50;

export async function registrarTentativaImportacaoIA(params: { tenantId: string; usuarioId: string }): Promise<{ permitido: boolean }> {
  const admin = createAdminClient();
  const desde = new Date(Date.now() - JANELA_MS).toISOString();

  const { count } = await admin.from("tentativas_importacao_ia").select("id", { count: "exact", head: true }).eq("tenant_id", params.tenantId).gte("criado_em", desde);

  const permitido = (count ?? 0) < LIMITE_USOS_POR_TENANT_NA_JANELA;

  await admin.from("tentativas_importacao_ia").insert({ tenant_id: params.tenantId, usuario_id: params.usuarioId });

  return { permitido };
}
