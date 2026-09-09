import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";

// Mesmo padrão de lib/chat-ia/rate-limit.ts (tabela no Postgres, só
// service_role, sempre registra mesmo negando, janela deslizante por
// tenant_id) — achado real em auditoria: extrairLancamentosIAAction só
// verificava se o usuário estava autenticado, sem nenhum teto de uso.
//
// Número recalculado (08/09/2026) pra proteger margem, não só travar loop:
// com cache de prompt (ver extracao-ia.ts) cada extração custa em torno de
// US$0,0092 (o bloco fixo de prompt+schema entra como leitura de cache; o
// grosso do custo é o texto/imagem enviado + os lançamentos extraídos, que
// variam por natureza). 10/dia = pior caso de ~US$2,76/tenant/mês — 10x
// acima do uso real esperado (~1/dia), sem deixar um tenant abusando
// consumir uma fatia desproporcional da margem do plano com IA.
// Substituiu os 50/dia anteriores.
const JANELA_MS = 24 * 60 * 60 * 1000;
const LIMITE_USOS_POR_TENANT_NA_JANELA = 10;

export async function registrarTentativaImportacaoIA(params: { tenantId: string; usuarioId: string }): Promise<{ permitido: boolean }> {
  const admin = createAdminClient();
  const desde = new Date(Date.now() - JANELA_MS).toISOString();

  const { count } = await admin.from("tentativas_importacao_ia").select("id", { count: "exact", head: true }).eq("tenant_id", params.tenantId).gte("criado_em", desde);

  const permitido = (count ?? 0) < LIMITE_USOS_POR_TENANT_NA_JANELA;

  await admin.from("tentativas_importacao_ia").insert({ tenant_id: params.tenantId, usuario_id: params.usuarioId });

  return { permitido };
}
