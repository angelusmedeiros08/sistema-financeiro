"use server";

import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { extrairLancamentosIA } from "@/lib/importacao/extracao-ia";
import { registrarTentativaImportacaoIA } from "@/lib/importacao/rate-limit-ia";
import type { LinhaBrutaIA } from "@/lib/importacao/tipos";

// Não recebe nenhum dado do tenant além do que o próprio usuário colou/subiu
// nesta tela — a extração em si não consulta o banco (ver
// lib/importacao/extracao-ia.ts), só precisa do contexto autenticado pra
// não expor esse endpoint a quem não está logado.
export async function extrairLancamentosIAAction(
  entrada: { texto: string } | { imagemBase64: string; imagemMediaType: "image/jpeg" | "image/png" | "image/webp" },
): Promise<{ linhas: LinhaBrutaIA[] } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  // Achado real em auditoria de custo: esta action não tinha nenhum teto de
  // uso, diferente do Chat IA (mesmo mecanismo, lib/chat-ia/rate-limit.ts).
  const { permitido } = await registrarTentativaImportacaoIA({ tenantId: contexto.tenantId, usuarioId: contexto.user.id });
  if (!permitido) return { erro: "Limite de uso da Importação com IA atingido — tente de novo mais tarde." };

  return extrairLancamentosIA(entrada);
}
