import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";

// Mesmo padrão de lib/seguranca/rate-limit-auth.ts (tabela no Postgres,
// só service_role, sempre registra mesmo negando, janela deslizante) — eixo
// trocado de e-mail/IP pra tenant_id, já que aqui é cota de uso/custo, não
// proteção contra força bruta.
//
// Número recalculado (08/09/2026) pra proteger margem, não só travar loop:
// com cache de prompt (ver loop.ts) o custo por mensagem do Chat IA gira em
// torno de US$0,0063 (1,5 chamada em média, bloco fixo de prompt+ferramentas
// entrando como leitura de cache a US$0,20/MTok em vez de US$2/MTok cru).
// 15/dia = pior caso de ~US$2,84/tenant/mês só de chat — bem acima do uso
// real esperado (poucas mensagens por dia) mas já não deixa um tenant
// abusando consumir uma fatia desproporcional da margem do plano com IA.
// Substituiu os 30/dia anteriores (que por sua vez já tinham substituído um
// placeholder de 200/dia).
const JANELA_MS = 24 * 60 * 60 * 1000;
const LIMITE_MENSAGENS_POR_TENANT_NA_JANELA = 15;

export type UsoChatIA = { usado: number; limite: number };

export async function registrarTentativaChatIA(params: { tenantId: string; usuarioId: string }): Promise<{ permitido: boolean } & UsoChatIA> {
  const admin = createAdminClient();
  const desde = new Date(Date.now() - JANELA_MS).toISOString();

  const { count } = await admin.from("tentativas_chat_ia").select("id", { count: "exact", head: true }).eq("tenant_id", params.tenantId).gte("criado_em", desde);

  const antes = count ?? 0;
  const permitido = antes < LIMITE_MENSAGENS_POR_TENANT_NA_JANELA;

  await admin.from("tentativas_chat_ia").insert({ tenant_id: params.tenantId, usuario_id: params.usuarioId });

  // usado reflete a tentativa atual (já registrada), não só o que veio antes
  // dela — é o número que a UI deve mostrar depois desta mensagem.
  return { permitido, usado: Math.min(antes + 1, LIMITE_MENSAGENS_POR_TENANT_NA_JANELA), limite: LIMITE_MENSAGENS_POR_TENANT_NA_JANELA };
}

// Leitura pura, sem registrar tentativa nenhuma — usada só pra UI mostrar o
// consumo atual (ex.: ao abrir o painel do chat, antes de mandar qualquer
// mensagem nova).
export async function obterUsoChatIA(tenantId: string): Promise<UsoChatIA> {
  const admin = createAdminClient();
  const desde = new Date(Date.now() - JANELA_MS).toISOString();

  const { count } = await admin.from("tentativas_chat_ia").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("criado_em", desde);

  return { usado: Math.min(count ?? 0, LIMITE_MENSAGENS_POR_TENANT_NA_JANELA), limite: LIMITE_MENSAGENS_POR_TENANT_NA_JANELA };
}
