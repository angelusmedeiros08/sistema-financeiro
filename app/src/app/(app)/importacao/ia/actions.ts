"use server";

import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { extrairLancamentosIA } from "@/lib/importacao/extracao-ia";
import { registrarTentativaImportacaoIA, obterUsoImportacaoIA, type UsoImportacaoIA } from "@/lib/importacao/rate-limit-ia";
import type { LinhaBrutaIA } from "@/lib/importacao/tipos";

// Não recebe nenhum dado do tenant além do que o próprio usuário colou/subiu
// nesta tela — a extração em si não consulta o banco (ver
// lib/importacao/extracao-ia.ts), só precisa do contexto autenticado pra
// não expor esse endpoint a quem não está logado.
export async function extrairLancamentosIAAction(
  entrada: { texto: string } | { imagemBase64: string; imagemMediaType: "image/jpeg" | "image/png" | "image/webp" },
): Promise<({ linhas: LinhaBrutaIA[] } | { erro: string }) & { uso?: UsoImportacaoIA }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  // Achado real em auditoria de custo: esta action não tinha nenhum teto de
  // uso, diferente do Chat IA (mesmo mecanismo, lib/chat-ia/rate-limit.ts).
  const { permitido, usado, limite } = await registrarTentativaImportacaoIA({ tenantId: contexto.tenantId, usuarioId: contexto.user.id });
  if (!permitido) return { erro: "Limite de uso da Importação com IA atingido. Tente de novo mais tarde.", uso: { usado, limite } };

  const resultado = await extrairLancamentosIA(entrada);
  return { ...resultado, uso: { usado, limite } };
}

// Leitura pura do consumo atual — chamada ao abrir a tela, antes de
// qualquer extração, pra UI já nascer mostrando o indicador certo (mesmo
// padrão do GET /api/chat no Chat IA).
export async function obterUsoImportacaoIAAction(): Promise<UsoImportacaoIA | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };
  return obterUsoImportacaoIA(contexto.tenantId);
}
