"use server";

import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { extrairLancamentosIA } from "@/lib/importacao/extracao-ia";
import { verificarOrcamento, registrarCustoIA, obterUso, type UsoIA } from "@/lib/ia/orcamento-ia";
import { calcularCustoUsd } from "@/lib/ia/precos-anthropic";
import type { LinhaBrutaIA } from "@/lib/importacao/tipos";

// A extração em si não consulta o banco (ver lib/importacao/extracao-ia.ts)
// além do nome do próprio tenant — passado pro prompt pra IA saber quem é
// "nós" e não confundir a própria empresa com a contraparte do lançamento
// (achado real, 11/09/2026: um recibo "recebi do (sr) a [nome do tenant]"
// virava cliente nosso em vez de despesa com o fornecedor real).
export async function extrairLancamentosIAAction(
  entrada: { texto: string } | { imagemBase64: string; imagemMediaType: "image/jpeg" | "image/png" | "image/webp" },
): Promise<({ linhas: LinhaBrutaIA[] } | { erro: string }) & { uso?: UsoIA }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  // Checagem prévia por custo real (spec 2026-09-10) — orçamento
  // compartilhado com o Chat IA, mesmo mecanismo, mesma tabela.
  const previa = await verificarOrcamento(contexto.tenantId);
  if (!previa.permitido) {
    return { erro: "Limite de uso de IA do mês atingido. Tente de novo mais tarde ou contate o suporte.", uso: previa };
  }

  const resultado = await extrairLancamentosIA(entrada, contexto.tenantNome);

  // Registrado DEPOIS da chamada, com o custo de verdade — antes da
  // resposta voltar não tem como saber quanto uma extração vai custar
  // (varia muito com o tamanho do texto/imagem e a quantidade de
  // lançamentos extraídos).
  const custoUsd = calcularCustoUsd(resultado.usage);
  await registrarCustoIA({ tenantId: contexto.tenantId, usuarioId: contexto.user.id, recurso: "importacao", custoUsd });

  // Relida do banco (em vez de recalcular em USD e converter aqui) —
  // orcamento-ia.ts é o único lugar que conhece a taxa de câmbio de
  // referência, evita duplicar a conta.
  const uso = await obterUso(contexto.tenantId);
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
