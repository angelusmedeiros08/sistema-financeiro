"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { criarCheckoutAssinatura } from "@/lib/asaas/checkout";
import { ErroAsaas } from "@/lib/asaas/cliente-http";
import { validarCpfCnpj } from "./cpf-cnpj";
import { registrarTentativaAssinatura } from "./rate-limit";
import { VALOR_PLANO_MENSAL, DESCRICAO_PLANO, TRIAL_DIAS } from "./plano";

type ResultadoAssinar = { erro: string };

function dataISO(diasAPartirDeHoje: number): string {
  const data = new Date();
  data.setDate(data.getDate() + diasAPartirDeHoje);
  return data.toISOString().slice(0, 10);
}

function obterIpDaRequisicao(cabecalhos: Headers): string {
  // Vercel/proxies populam x-forwarded-for com a cadeia completa
  // (cliente, proxy1, proxy2...) — o primeiro é o mais próximo do cliente.
  const encaminhado = cabecalhos.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0].trim();
  return cabecalhos.get("x-real-ip") ?? "desconhecido";
}

export async function assinar(formData: FormData): Promise<ResultadoAssinar | never> {
  const nomeEmpresa = String(formData.get("nome_empresa") ?? "").trim();
  const nomeResponsavel = String(formData.get("nome_responsavel") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const cpfCnpj = String(formData.get("cpf_cnpj") ?? "").trim();
  const formaPagamento = String(formData.get("forma_pagamento") ?? "");

  if (!nomeEmpresa || !nomeResponsavel || !email) {
    return { erro: "Preencha todos os campos." };
  }
  if (formaPagamento !== "CREDIT_CARD" && formaPagamento !== "PIX") {
    return { erro: "Escolha uma forma de pagamento." };
  }
  if (!validarCpfCnpj(cpfCnpj)) {
    return { erro: "CPF ou CNPJ inválido." };
  }

  const cabecalhos = await headers();
  const ip = obterIpDaRequisicao(cabecalhos);

  const { permitido } = await registrarTentativaAssinatura({ email, ip });
  if (!permitido) {
    return { erro: "Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let checkout;
  try {
    checkout = await criarCheckoutAssinatura({
      nomeCliente: nomeResponsavel,
      email,
      cpfCnpj,
      callbackUrlSucesso: `${siteUrl}/assinar/retorno`,
      callbackUrlCancelado: `${siteUrl}/assinar/retorno?status=cancelado`,
      valor: VALOR_PLANO_MENSAL,
      descricaoItem: DESCRICAO_PLANO,
      // Cartão: cobra só depois do trial. Pix não tem trial nativo, cobra na
      // primeira janela disponível (spec: trial é benefício exclusivo do
      // caminho cartão).
      proximoVencimento: formaPagamento === "CREDIT_CARD" ? dataISO(TRIAL_DIAS) : dataISO(0),
      formaPagamento,
      nomeEmpresa,
    });
  } catch (erro) {
    if (erro instanceof ErroAsaas) {
      return { erro: "Não foi possível iniciar a assinatura agora. Tente novamente em instantes." };
    }
    throw erro;
  }

  redirect(checkout.link);
}
