import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { interpretarEventoAsaas } from "@/lib/asaas/webhook";
import { buscarAssinaturaAsaas, buscarClienteAsaas } from "@/lib/asaas/consulta";
import { provisionarTenantNovo } from "@/lib/tenant/provisionar";
import { enviarEmailConvite } from "@/lib/tenant/convite-email";
import { TRIAL_DIAS } from "@/lib/pagamentos/plano";
import { hojeIsoBrasil } from "@/lib/data-brasil";
import { somarDias } from "@/lib/relatorios/saldo-projetado";

// Chamada pelo Asaas, nunca pelo navegador — autenticação é um segredo
// compartilhado (header asaas-access-token, comparação em tempo constante),
// mesmo padrão dos 2 endpoints de cron. Único gatilho de provisionamento de
// tenant novo do fluxo de assinatura — o retorno do navegador ao checkout
// (/assinar/retorno) nunca é tratado como prova de pagamento, só o webhook,
// validado server-to-server (ver spec 2026-08-23-checkout-assinatura-
// provisionamento-design.md, "Segurança do retorno do checkout").
function segredoValido(recebido: string | null): boolean {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!recebido || !esperado) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!segredoValido(request.headers.get("asaas-access-token"))) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const corpo: unknown = await request.json().catch(() => null);
  if (!corpo || typeof corpo !== "object") {
    return NextResponse.json({ erro: "Payload inválido." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Asaas garante entrega "at least once" — o mesmo evento pode chegar mais
  // de uma vez. eventoId é checado ANTES de processar (nunca depois),
  // senão duas entregas quase simultâneas do mesmo evento passam as duas
  // pela checagem antes de qualquer uma marcar como processada.
  const eventoId = typeof (corpo as Record<string, unknown>).id === "string" ? ((corpo as Record<string, unknown>).id as string) : null;
  if (eventoId) {
    const { data: jaProcessado } = await admin.from("eventos_pagamento_processados").select("id").eq("id", eventoId).maybeSingle();
    if (jaProcessado) return NextResponse.json({ ok: true });
  }

  const evento = interpretarEventoAsaas(corpo);
  if (!evento) {
    // Evento que não nos interessa — responde 200 mesmo assim, senão o
    // Asaas reentrega pra sempre.
    return NextResponse.json({ ok: true });
  }

  try {
    if (evento.tipo === "checkout_pago") {
      await processarCheckoutPago(admin, evento.assinaturaExternaId);
    } else if (evento.tipo === "pagamento_confirmado") {
      await admin.from("tenants").update({ status_assinatura: "ativo" }).eq("asaas_subscription_id", evento.assinaturaExternaId);
    } else if (evento.tipo === "pagamento_atrasado") {
      await admin.from("tenants").update({ status_assinatura: "inadimplente" }).eq("asaas_subscription_id", evento.assinaturaExternaId);
    } else if (evento.tipo === "assinatura_cancelada") {
      await admin.from("tenants").update({ status_assinatura: "cancelado" }).eq("asaas_subscription_id", evento.assinaturaExternaId);
    }
  } catch (erro) {
    // Nunca vazar detalhe interno (stack trace, mensagem de SDK) na
    // resposta — só loga server-side. Sem marcar eventoId como processado:
    // uma reentrega do Asaas tenta de novo.
    console.error("[webhook-asaas] falha ao processar evento", evento.tipo, erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erro: "Falha ao processar evento." }, { status: 500 });
  }

  if (eventoId) {
    await admin.from("eventos_pagamento_processados").insert({ id: eventoId, tipo: evento.tipo });
  }

  return NextResponse.json({ ok: true });
}

// Cria o tenant + usuário admin a partir de uma assinatura recém-paga.
// Busca cliente/assinatura direto na API do Asaas (nunca confia em campo
// do payload do webhook pra dado usado em provisionamento) — mais simples
// de auditar um formato de resposta conhecido do que validar todo campo
// que um payload de evento poderia conter.
//
// Sempre provisiona como "trial" (nunca "ativo" direto): pro caminho
// cartão, CHECKOUT_PAID pode significar só "cartão validado/tokenizado",
// não necessariamente uma cobrança de verdade — a cobrança real só
// acontece no primeiro vencimento (até 7 dias depois). O evento
// PAYMENT_CONFIRMED subsequente (que chega pros dois caminhos, cartão e
// Pix) corrige pra "ativo" assim que a cobrança de fato confirmar — nunca
// concede acesso permanente sem essa confirmação later.
async function processarCheckoutPago(admin: ReturnType<typeof createAdminClient>, assinaturaExternaId: string) {
  const assinatura = await buscarAssinaturaAsaas(assinaturaExternaId);
  const cliente = await buscarClienteAsaas(assinatura.customer);
  const nomeEmpresa = assinatura.externalReference || cliente.name;

  // Mesmo mecanismo já usado no convite de equipe (lib/tenant/equipe.ts):
  // generateLink (não inviteUserByEmail) cria a conta sem mandar e-mail
  // automático do Supabase — o link vai por conta própria, consumido só
  // num clique real em /convite/aceitar, nunca por um GET simples.
  const { data: convite, error: erroConvite } = await admin.auth.admin.generateLink({
    type: "invite",
    email: cliente.email,
    options: { data: { nome: cliente.name } },
  });
  if (erroConvite || !convite.user) {
    throw new Error(erroConvite?.message ?? "Falha ao criar usuário a partir do pagamento confirmado.");
  }

  const resultado = await provisionarTenantNovo({
    nome: nomeEmpresa,
    usuarioId: convite.user.id,
    asaasCustomerId: assinatura.customer,
    asaasSubscriptionId: assinaturaExternaId,
    statusAssinatura: "trial",
    trialTerminaEm: somarDias(hojeIsoBrasil(), TRIAL_DIAS),
  });
  if ("erro" in resultado) throw new Error(resultado.erro);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const linkAceite = `${siteUrl}/convite/aceitar?token=${encodeURIComponent(convite.properties.hashed_token)}&email=${encodeURIComponent(cliente.email)}&papel=admin&tenant=${encodeURIComponent(nomeEmpresa)}&next=${encodeURIComponent("/convite/definir-senha")}`;

  const resultadoEmail = await enviarEmailConvite({ email: cliente.email, tenantNome: nomeEmpresa, papel: "admin", linkAceite });
  if ("erro" in resultadoEmail) {
    // Tenant já foi provisionado com sucesso — não desfaz por causa de
    // falha só no envio do e-mail (mesmo raciocínio de convidarUsuario em
    // equipe.ts). Fica registrado no log do servidor pra alguém reenviar
    // manualmente se precisar.
    console.error("[webhook-asaas] tenant provisionado mas e-mail de boas-vindas falhou:", resultadoEmail.erro);
  }
}
