"use server";

import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { extrairLancamentosIA } from "@/lib/importacao/extracao-ia";
import { verificarOrcamento, registrarCustoIA, obterUso, type UsoIA } from "@/lib/ia/orcamento-ia";
import { calcularCustoUsd } from "@/lib/ia/precos-anthropic";
import type { LinhaBrutaIA } from "@/lib/importacao/tipos";

// Não recebe nenhum dado do tenant além do que o próprio usuário colou/subiu
// nesta tela — a extração em si não consulta o banco (ver
// lib/importacao/extracao-ia.ts), só precisa do contexto autenticado pra
// não expor esse endpoint a quem não está logado.
export async function extrairLancamentosIAAction(
  entrada: { texto: string } | { imagemBase64: string; imagemMediaType: "image/jpeg" | "image/png" | "image/webp" },
): Promise<({ linhas: LinhaBrutaIA[] } | { erro: string }) & { uso?: UsoIA }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  // Checagem prévia por custo real (spec 2026-09-10) — orçamento
  // compartilhado com o Chat IA, mesmo mecanismo, mesma tabela.
  const { permitido, usadoUsd, limiteUsd } = await verificarOrcamento(contexto.tenantId);
  if (!permitido) return { erro: "Limite de uso de IA do mês atingido. Tente de novo mais tarde ou contate o suporte.", uso: { usadoUsd, limiteUsd } };

  const resultado = await extrairLancamentosIA(entrada);

  // Registrado DEPOIS da chamada, com o custo de verdade — antes da
  // resposta voltar não tem como saber quanto uma extração vai custar
  // (varia muito com o tamanho do texto/imagem e a quantidade de
  // lançamentos extraídos).
  const custoUsd = calcularCustoUsd(resultado.usage);
  await registrarCustoIA({ tenantId: contexto.tenantId, usuarioId: contexto.user.id, recurso: "importacao", custoUsd });

  const uso: UsoIA = { usadoUsd: Math.min(usadoUsd + custoUsd, limiteUsd), limiteUsd };
  if ("erro" in resultado) return { erro: resultado.erro, uso };
  return { linhas: resultado.linhas, uso };
}

// Leitura pura do consumo atual — chamada ao abrir a tela, antes de
// qualquer extração, pra UI já nascer mostrando o indicador certo (mesmo
// padrão do GET /api/chat no Chat IA). Mesmo orçamento do Chat IA.
export async function obterUsoImportacaoIAAction(): Promise<UsoIA | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };
  return obterUso(contexto.tenantId);
}
