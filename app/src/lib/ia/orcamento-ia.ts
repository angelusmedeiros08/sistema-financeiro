import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";

// Substitui limitador-uso-diario.ts (spec 2026-09-10): antes contava
// tentativas (15/dia chat, 10/dia importação, cada uma valendo "1"
// independente do tamanho) — trocado por custo real em USD, medido via
// `usage` que a própria API da Anthropic devolve em toda resposta (ver
// lib/ia/precos-anthropic.ts), num orçamento único COMPARTILHADO entre
// Chat IA e Importação com IA.
//
// R$30/mês (decisão do usuário, 10/09/2026), convertido em dólar pela
// cotação de referência do momento (~R$5,10/US$1, 10/09/2026 —
// aproximação documentada, revisar se o câmbio se mover muito).
// Arredondado pra cima (US$5,88 → US$5,90), levemente mais generoso que
// R$30,00 exato.
export const TETO_MENSAL_IA_USD = 5.9;

// Janela deslizante de 30 dias, não um "reset" no dia 1 do mês — mesmo
// mecanismo das outras janelas deslizantes do projeto (trial, cota
// antiga). Escolhida como MENSAL (não diária) de propósito: um teto
// diário bloquearia uma importação grande (natural desse recurso — um
// extrato inteiro de uma vez, não um pouco por dia) até o dia seguinte,
// mesmo com saldo sobrando no mês. Uso é responsabilidade do tenant
// gerenciar o próprio ritmo — o sistema só bloqueia quando o teto é
// atingido de verdade, não tenta espalhar o consumo.
const JANELA_MS = 30 * 24 * 60 * 60 * 1000;

export type UsoIA = { usadoUsd: number; limiteUsd: number };
export type RecursoIA = "chat" | "importacao";

// Checagem PRÉVIA — só lê, nunca escreve. Diferente do mecanismo antigo
// (que incrementava contagem antes da chamada), aqui não dá pra saber o
// custo de uma chamada antes dela acontecer de verdade, então a única
// coisa que dá pra checar de antemão é se o tenant JÁ estourou o
// orçamento com chamadas anteriores. Uma chamada que começa com o tenant
// a poucos centavos do teto ainda é permitida e cobrada por inteiro —
// mesmo comportamento de qualquer sistema de orçamento por uso (nuvem,
// telefonia), o teto vale pra chamadas futuras, não corta uma no meio.
export async function verificarOrcamento(tenantId: string): Promise<{ permitido: boolean } & UsoIA> {
  const uso = await obterUso(tenantId);
  return { permitido: uso.usadoUsd < TETO_MENSAL_IA_USD, ...uso };
}

// Registro PÓS-chamada — sempre grava o custo real, mesmo que isso
// estoure o orçamento (a chamada já aconteceu e já foi paga pra Anthropic
// nesse momento; não tem como "não cobrar" depois). Chamar mesmo quando a
// chamada à IA falhou no meio de um loop de tool use — iterações
// anteriores àquela que falhou já consumiram token de verdade.
export async function registrarCustoIA(params: { tenantId: string; usuarioId: string; recurso: RecursoIA; custoUsd: number }): Promise<void> {
  const admin = createAdminClient();
  await admin.from("uso_ia").insert({ tenant_id: params.tenantId, usuario_id: params.usuarioId, recurso: params.recurso, custo_usd: params.custoUsd });
}

// Leitura pura — soma os dois recursos juntos (é isso que implementa o
// orçamento combinado), usada tanto por verificarOrcamento quanto pela UI
// pra mostrar o indicador sem registrar nada.
export async function obterUso(tenantId: string): Promise<UsoIA> {
  const admin = createAdminClient();
  const desde = new Date(Date.now() - JANELA_MS).toISOString();

  const { data } = await admin.from("uso_ia").select("custo_usd").eq("tenant_id", tenantId).gte("criado_em", desde);

  const usadoUsd = (data ?? []).reduce((soma, linha) => soma + Number(linha.custo_usd), 0);
  return { usadoUsd: Math.min(usadoUsd, TETO_MENSAL_IA_USD), limiteUsd: TETO_MENSAL_IA_USD };
}
