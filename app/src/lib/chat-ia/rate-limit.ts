import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";

// Mesmo padrão de lib/seguranca/rate-limit-auth.ts (tabela no Postgres,
// só service_role, sempre registra mesmo negando, janela deslizante) — eixo
// trocado de e-mail/IP pra tenant_id, já que aqui é cota de uso/custo, não
// proteção contra força bruta.
//
// Número decidido (não é mais placeholder): 30/dia dá espaço de sobra pra
// uso ativo de verdade (alguém revisando o mês inteiro, pergunta atrás de
// pergunta — uma sessão assim fica bem abaixo do teto) sem deixar a conta de
// API exposta a um loop de frontend ou uso indevido. Uso real esperado fica
// na casa de poucas mensagens por dia; 200/dia (valor anterior) dava 200x de
// folga sobre isso, exposição de custo desproporcional ao uso normal.
const JANELA_MS = 24 * 60 * 60 * 1000;
const LIMITE_MENSAGENS_POR_TENANT_NA_JANELA = 30;

export async function registrarTentativaChatIA(params: { tenantId: string; usuarioId: string }): Promise<{ permitido: boolean }> {
  const admin = createAdminClient();
  const desde = new Date(Date.now() - JANELA_MS).toISOString();

  const { count } = await admin.from("tentativas_chat_ia").select("id", { count: "exact", head: true }).eq("tenant_id", params.tenantId).gte("criado_em", desde);

  const permitido = (count ?? 0) < LIMITE_MENSAGENS_POR_TENANT_NA_JANELA;

  await admin.from("tentativas_chat_ia").insert({ tenant_id: params.tenantId, usuario_id: params.usuarioId });

  return { permitido };
}
