"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { aprovarOrcamentoPublico, recusarOrcamentoPublico } from "@/lib/vendas/orcamento-publico";
import { registrarTentativaAuth, obterIpDaRequisicao } from "@/lib/seguranca/rate-limit-auth";

type ResultadoAcao = { erro: string } | { sucesso: true };

const MENSAGEM_MUITAS_TENTATIVAS = "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";

export async function aprovarOrcamentoPublicoAction(token: string): Promise<ResultadoAcao> {
  const ip = obterIpDaRequisicao(await headers());
  const { permitido } = await registrarTentativaAuth({ finalidade: "orcamento_publico", email: token, ip });
  if (!permitido) return { erro: MENSAGEM_MUITAS_TENTATIVAS };

  const resultado = await aprovarOrcamentoPublico(token);
  if ("erro" in resultado) return resultado;

  revalidatePath(`/orcamento/${token}`);
  return { sucesso: true };
}

export async function recusarOrcamentoPublicoAction(token: string, motivo: string): Promise<ResultadoAcao> {
  const ip = obterIpDaRequisicao(await headers());
  const { permitido } = await registrarTentativaAuth({ finalidade: "orcamento_publico", email: token, ip });
  if (!permitido) return { erro: MENSAGEM_MUITAS_TENTATIVAS };

  const resultado = await recusarOrcamentoPublico(token, motivo);
  if ("erro" in resultado) return resultado;

  revalidatePath(`/orcamento/${token}`);
  return { sucesso: true };
}
