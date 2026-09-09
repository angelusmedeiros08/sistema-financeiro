import "server-only";
import { criarLimitadorDiario, type UsoDiario } from "@/lib/ia/limitador-uso-diario";

// Número recalculado (08/09/2026) pra proteger margem, não só travar loop:
// com cache de prompt (ver extracao-ia.ts) cada extração custa em torno de
// US$0,0092 (o bloco fixo de prompt+schema entra como leitura de cache; o
// grosso do custo é o texto/imagem enviado + os lançamentos extraídos, que
// variam por natureza). 10/dia = pior caso de ~US$2,76/tenant/mês — 10x
// acima do uso real esperado (~1/dia), sem deixar um tenant abusando
// consumir uma fatia desproporcional da margem do plano com IA.
// Substituiu os 50/dia anteriores.
const LIMITE_USOS_POR_TENANT_NA_JANELA = 10;

export type UsoImportacaoIA = UsoDiario;

const limitador = criarLimitadorDiario({ tabela: "tentativas_importacao_ia", limite: LIMITE_USOS_POR_TENANT_NA_JANELA });

export const registrarTentativaImportacaoIA = limitador.registrarTentativa;
export const obterUsoImportacaoIA = limitador.obterUso;
