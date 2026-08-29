"use server";

import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { extrairLancamentosIA } from "@/lib/importacao/extracao-ia";
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

  return extrairLancamentosIA(entrada);
}
