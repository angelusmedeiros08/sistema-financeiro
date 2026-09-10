import "server-only";
import { chamarAsaas } from "./cliente-http";

type CicloAssinatura = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";

export type CheckoutAssinatura = { checkoutId: string; link: string };

type RespostaCheckout = { id: string; link: string };

// Cria um Checkout hospedado do Asaas (tipo RECURRENT) e devolve o link pra
// redirecionar o cliente. NENHUMA função em lib/asaas/ recebe ou manipula
// dado de cartão — o Checkout é hospedado pelo próprio Asaas, o número do
// cartão nunca passa pelo nosso servidor (é o ponto central da correção de
// escopo PCI: SAQ-A em vez de SAQ-D — ver spec).
//
// A API do Asaas (POST /v3/checkouts) não aceita referenciar um customer já
// existente por id — só customerData inline. O id real do customer criado só
// aparece depois, no payload do webhook de pagamento (Fatia 6).
export async function criarCheckoutAssinatura(params: {
  nomeCliente: string;
  email: string;
  cpfCnpj: string;
  callbackUrlSucesso: string;
  callbackUrlCancelado: string;
  valor: number;
  descricaoItem: string;
  proximoVencimento: string; // "YYYY-MM-DD"
  // Array pra permitir o autoatendimento de assinatura oferecer os dois
  // métodos juntos na página hospedada do Asaas (sem trial em jogo pra
  // reativação/upgrade, não há motivo pra forçar escolha antes) — o
  // cadastro novo em /assinar continua passando só um (ver assinatura-
  // actions.ts: trial de 7 dias é exclusivo do caminho cartão).
  formasPagamento: ("CREDIT_CARD" | "PIX")[];
  // Nome da empresa escolhido no formulário de /assinar — nada é provisionado
  // ainda nesse ponto (Fatia 4), então não há tenant pra guardar isso. Vai e
  // volta pelo próprio Asaas: o webhook de pagamento confirmado (Fatia 6) lê
  // de volta esse valor pra saber com que nome criar o tenant.
  nomeEmpresa: string;
  ciclo?: CicloAssinatura;
  // Autoatendimento de assinatura (spec 2026-09-09): reativação/upgrade de
  // trial geram um checkout novo pra um tenant que JÁ existe — o webhook
  // precisa distinguir isso do cadastro novo (que usa nomeEmpresa acima) pra
  // não tentar provisionar um tenant duplicado. Convenção: `tenant:{id}`.
  // Quando presente, substitui nomeEmpresa como externalReference.
  externalReferenceOverride?: string;
}): Promise<CheckoutAssinatura> {
  const resposta = await chamarAsaas<RespostaCheckout>("/v3/checkouts", {
    method: "POST",
    body: JSON.stringify({
      billingTypes: params.formasPagamento,
      chargeTypes: ["RECURRENT"],
      minutesToExpire: 60,
      externalReference: params.externalReferenceOverride ?? params.nomeEmpresa,
      callback: {
        successUrl: params.callbackUrlSucesso,
        cancelUrl: params.callbackUrlCancelado,
        expiredUrl: params.callbackUrlCancelado,
      },
      items: [{ name: params.descricaoItem, quantity: 1, value: params.valor }],
      customerData: {
        name: params.nomeCliente,
        email: params.email,
        cpfCnpj: params.cpfCnpj,
      },
      subscription: {
        cycle: params.ciclo ?? "MONTHLY",
        nextDueDate: params.proximoVencimento,
      },
    }),
  });

  return { checkoutId: resposta.id, link: resposta.link };
}
