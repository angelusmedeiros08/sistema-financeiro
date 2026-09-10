"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { criarCheckoutAssinatura } from "@/lib/asaas/checkout";
import { buscarAssinaturaAsaas, buscarClienteAsaas, cancelarAssinaturaAsaas } from "@/lib/asaas/consulta";
import { ErroAsaas } from "@/lib/asaas/cliente-http";
import { createAdminClient } from "@/utils/supabase/admin";
import { VALOR_PLANO_MENSAL, DESCRICAO_PLANO } from "./plano";
import { hojeIsoBrasil } from "@/lib/data-brasil";

type Resultado = { erro: string };

// Reativação (tenant cancelado) e upgrade de trial são o mesmo mecanismo por
// baixo (spec 2026-09-09): gerar um Checkout novo pra um tenant que JÁ
// existe, usando os dados de cliente já cadastrados no Asaas — nunca pede
// nome/e-mail/CPF de novo, diferente do cadastro em /assinar. Sem trial em
// jogo aqui (o tenant já é cliente), então os dois métodos de pagamento vão
// juntos pro Checkout — quem escolhe é a pessoa, na página do Asaas.
async function gerarCheckoutParaTenantAtual(params: { ignorarGateAssinatura: boolean; callbackBase: string }): Promise<Resultado | never> {
  const contexto = await obterUsuarioETenantAtual(params.ignorarGateAssinatura);
  if ("erro" in contexto) return { erro: contexto.erro };
  if (contexto.papel !== "admin") return { erro: "Só o administrador da empresa pode gerenciar a assinatura." };
  if (!contexto.asaasCustomerId) return { erro: "Assinatura sem cadastro no Asaas — contate o suporte." };

  let cliente;
  try {
    cliente = await buscarClienteAsaas(contexto.asaasCustomerId);
  } catch (erro) {
    if (erro instanceof ErroAsaas) return { erro: "Não foi possível iniciar o pagamento agora. Tente novamente em instantes." };
    throw erro;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let checkout;
  try {
    checkout = await criarCheckoutAssinatura({
      nomeCliente: cliente.name,
      email: cliente.email,
      cpfCnpj: cliente.cpfCnpj,
      callbackUrlSucesso: `${siteUrl}${params.callbackBase}?retorno=confirmando`,
      callbackUrlCancelado: `${siteUrl}${params.callbackBase}`,
      valor: VALOR_PLANO_MENSAL,
      descricaoItem: DESCRICAO_PLANO,
      proximoVencimento: hojeIsoBrasil(),
      formasPagamento: ["CREDIT_CARD", "PIX"],
      nomeEmpresa: contexto.tenantNome,
      // Marca este checkout como "tenant existente" pro webhook não tentar
      // provisionar um tenant/usuário novo — ver api/webhooks/asaas/route.ts.
      externalReferenceOverride: `tenant:${contexto.tenantId}`,
    });
  } catch (erro) {
    if (erro instanceof ErroAsaas) return { erro: "Não foi possível iniciar o pagamento agora. Tente novamente em instantes." };
    throw erro;
  }

  redirect(checkout.link);
}

// Selo de trial na topbar ("Assinar agora").
export async function assinarDuranteTrialAction(): Promise<Resultado | never> {
  return gerarCheckoutParaTenantAtual({ ignorarGateAssinatura: false, callbackBase: "/configuracoes/assinatura" });
}

// Botão "Reativar assinatura" em /assinatura-pendente — o tenant está
// bloqueado (cancelado), por isso ignora o gate normal (mesmo raciocínio já
// documentado em lib/tenant/atual.ts pros 3 lugares que precisam disso).
export async function reativarAssinaturaAction(): Promise<Resultado | never> {
  return gerarCheckoutParaTenantAtual({ ignorarGateAssinatura: true, callbackBase: "/assinatura-pendente" });
}

// Cancelamento voluntário — mantém acesso até o fim do período já pago
// (decisão explícita do usuário, diferente do bloqueio imediato usado pra
// inadimplência). `acesso_ate` vem do `nextDueDate` atual da assinatura no
// Asaas (a próxima cobrança que não vai mais acontecer é exatamente o fim
// do período já coberto pela última cobrança confirmada).
export async function cancelarAssinaturaAction(): Promise<Resultado | { sucesso: true; acessoAte: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };
  if (contexto.papel !== "admin") return { erro: "Só o administrador da empresa pode cancelar a assinatura." };
  if (!contexto.asaasSubscriptionId) return { erro: "Nenhuma assinatura ativa encontrada." };

  let assinatura;
  try {
    assinatura = await buscarAssinaturaAsaas(contexto.asaasSubscriptionId);
  } catch (erro) {
    if (erro instanceof ErroAsaas) return { erro: "Não foi possível consultar sua assinatura agora. Tente novamente em instantes." };
    throw erro;
  }

  const acessoAte = assinatura.nextDueDate ?? hojeIsoBrasil();

  try {
    await cancelarAssinaturaAsaas(contexto.asaasSubscriptionId);
  } catch (erro) {
    if (erro instanceof ErroAsaas) return { erro: "Não foi possível cancelar agora. Tente novamente em instantes." };
    throw erro;
  }

  // service_role: o tenant ainda não sabe que virou cancelamento_agendado, e
  // a RLS de UPDATE em tenants não libera esse campo pro próprio usuário.
  const admin = createAdminClient();
  const { error } = await admin.from("tenants").update({ status_assinatura: "cancelamento_agendado", acesso_ate: acessoAte }).eq("id", contexto.tenantId);
  if (error) {
    return { erro: "A assinatura foi cancelada no Asaas, mas houve uma falha ao atualizar o sistema — contate o suporte." };
  }

  revalidatePath("/configuracoes/assinatura");
  return { sucesso: true, acessoAte };
}
