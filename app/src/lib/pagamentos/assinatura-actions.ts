"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { criarCheckoutAssinatura } from "@/lib/asaas/checkout";
import { ErroAsaas } from "@/lib/asaas/cliente-http";
import { validarCpfCnpj } from "./cpf-cnpj";
import { registrarTentativaAssinatura } from "./rate-limit";
import { VALOR_PLANO_MENSAL, DESCRICAO_PLANO, TRIAL_DIAS } from "./plano";
import { hojeIsoBrasil } from "@/lib/data-brasil";
import { somarDias } from "@/lib/relatorios/saldo-projetado";
import { TERMOS_VERSAO } from "@/lib/legal/termos";
import { createAdminClient } from "@/utils/supabase/admin";

type ResultadoAssinar = { erro: string };

function dataISO(diasAPartirDeHoje: number): string {
  return somarDias(hojeIsoBrasil(), diasAPartirDeHoje);
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
  // Checkbox HTML só manda o campo no FormData quando marcado — desmarcado,
  // a chave nem existe. `Checkbox` do Radix injeta um input nativo oculto
  // sincronizado com `checked`, então isso reflete o estado real do form.
  const aceitouTermos = formData.get("aceite_termos") !== null;

  if (!nomeEmpresa || !nomeResponsavel || !email) {
    return { erro: "Preencha todos os campos." };
  }
  if (!validarCpfCnpj(cpfCnpj)) {
    return { erro: "CPF ou CNPJ inválido." };
  }
  if (!aceitouTermos) {
    return { erro: "É preciso aceitar os Termos de Uso e a Política de Privacidade." };
  }

  const cabecalhos = await headers();
  const ip = obterIpDaRequisicao(cabecalhos);

  const { permitido } = await registrarTentativaAssinatura({ email, ip });
  if (!permitido) {
    return { erro: "Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo." };
  }

  // Gravado aqui, não em provisionarTenantNovo — esse só roda dias depois,
  // disparado pelo webhook do Asaas confirmando pagamento, sem nenhum canal
  // pra saber se o checkbox foi marcado. O aceite é o que aconteceu agora,
  // no clique, então prova por e-mail/CPF-CNPJ, independente do
  // provisionamento do tenant ter sucesso depois.
  const admin = createAdminClient();
  await admin.from("aceites_termos").insert({ email, cpf_cnpj: cpfCnpj, termos_versao: TERMOS_VERSAO, ip });

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
      proximoVencimento: dataISO(TRIAL_DIAS),
      formasPagamento: ["CREDIT_CARD"],
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
