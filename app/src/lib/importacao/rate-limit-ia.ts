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

export type UsoImportacaoIA = { usado: number; limite: number };

export async function registrarTentativaImportacaoIA(params: { tenantId: string; usuarioId: string }): Promise<{ permitido: boolean } & UsoImportacaoIA> {
  const admin = createAdminClient();
  const desde = new Date(Date.now() - JANELA_MS).toISOString();

  const { count } = await admin.from("tentativas_importacao_ia").select("id", { count: "exact", head: true }).eq("tenant_id", params.tenantId).gte("criado_em", desde);

  const antes = count ?? 0;
  const permitido = antes < LIMITE_USOS_POR_TENANT_NA_JANELA;

  await admin.from("tentativas_importacao_ia").insert({ tenant_id: params.tenantId, usuario_id: params.usuarioId });

  // usado reflete a tentativa atual (já registrada), não só o que veio antes
  // dela — mesmo padrão de lib/chat-ia/rate-limit.ts.
  return { permitido, usado: Math.min(antes + 1, LIMITE_USOS_POR_TENANT_NA_JANELA), limite: LIMITE_USOS_POR_TENANT_NA_JANELA };
}

// Leitura pura, sem registrar tentativa nenhuma — usada só pra UI mostrar o
// consumo atual ao abrir a tela, antes de qualquer extração nova.
export async function obterUsoImportacaoIA(tenantId: string): Promise<UsoImportacaoIA> {
  const admin = createAdminClient();
  const desde = new Date(Date.now() - JANELA_MS).toISOString();

  const { count } = await admin.from("tentativas_importacao_ia").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("criado_em", desde);

  return { usado: Math.min(count ?? 0, LIMITE_USOS_POR_TENANT_NA_JANELA), limite: LIMITE_USOS_POR_TENANT_NA_JANELA };
}
