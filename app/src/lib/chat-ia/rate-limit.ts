import "server-only";
import { criarLimitadorDiario, type UsoDiario } from "@/lib/ia/limitador-uso-diario";

// Número recalculado (08/09/2026) pra proteger margem, não só travar loop:
// com cache de prompt (ver loop.ts) o custo por mensagem do Chat IA gira em
// torno de US$0,0063 (1,5 chamada em média, bloco fixo de prompt+ferramentas
// entrando como leitura de cache a US$0,20/MTok em vez de US$2/MTok cru).
// 15/dia = pior caso de ~US$2,84/tenant/mês só de chat — bem acima do uso
// real esperado (poucas mensagens por dia) mas já não deixa um tenant
// abusando consumir uma fatia desproporcional da margem do plano com IA.
// Substituiu os 30/dia anteriores (que por sua vez já tinham substituído um
// placeholder de 200/dia).
const LIMITE_MENSAGENS_POR_TENANT_NA_JANELA = 15;

export type UsoChatIA = UsoDiario;

const limitador = criarLimitadorDiario({ tabela: "tentativas_chat_ia", limite: LIMITE_MENSAGENS_POR_TENANT_NA_JANELA });

export const registrarTentativaChatIA = limitador.registrarTentativa;
export const obterUsoChatIA = limitador.obterUso;
