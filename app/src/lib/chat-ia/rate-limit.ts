import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";

// Mesmo padrão de lib/seguranca/rate-limit-auth.ts (tabela no Postgres,
// só service_role, sempre registra mesmo negando, janela deslizante) — eixo
// trocado de e-mail/IP pra tenant_id, já que aqui é cota de uso/custo, não
// proteção contra força bruta.
//
// VALOR PLACEHOLDER — política de estouro (o que acontece quando bate o
// limite, e qual o número certo) fica em aberto de propósito (Seção 2/7 da
// spec: "definiremos isso depois, mas deixe em aberto"). O mecanismo abaixo
// já funciona; só o número precisa ser revisitado antes de abrir pra
// usuários reais em produção.
const JANELA_MS = 24 * 60 * 60 * 1000;
const LIMITE_MENSAGENS_POR_TENANT_NA_JANELA = 200;

export async function registrarTentativaChatIA(params: { tenantId: string; usuarioId: string }): Promise<{ permitido: boolean }> {
  const admin = createAdminClient();
  const desde = new Date(Date.now() - JANELA_MS).toISOString();

  const { count } = await admin.from("tentativas_chat_ia").select("id", { count: "exact", head: true }).eq("tenant_id", params.tenantId).gte("criado_em", desde);

  const permitido = (count ?? 0) < LIMITE_MENSAGENS_POR_TENANT_NA_JANELA;

  await admin.from("tentativas_chat_ia").insert({ tenant_id: params.tenantId, usuario_id: params.usuarioId });

  return { permitido };
}
