import "server-only";
import type { EventoPagamento } from "@/lib/pagamentos/tipos";

// Único lugar que sabe os nomes de evento e o formato de payload do Asaas —
// ver "Princípio: o Asaas fica isolado" na spec de checkout/assinatura.
// Payload bruto é sempre tratado como entrada não confiável: cada campo é
// checado em tipo antes de ser usado, nunca repassado direto.
export function interpretarEventoAsaas(payloadBruto: unknown): EventoPagamento | null {
  if (typeof payloadBruto !== "object" || payloadBruto === null) return null;
  const corpo = payloadBruto as Record<string, unknown>;

  const evento = typeof corpo.event === "string" ? corpo.event : null;
  const checkout = typeof corpo.checkout === "object" && corpo.checkout !== null ? (corpo.checkout as Record<string, unknown>) : null;
  const payment = typeof corpo.payment === "object" && corpo.payment !== null ? (corpo.payment as Record<string, unknown>) : null;
  const subscription = typeof corpo.subscription === "object" && corpo.subscription !== null ? (corpo.subscription as Record<string, unknown>) : null;

  // CHECKOUT_PAID: dispara uma única vez, na conclusão do checkout — nunca
  // se repete numa renovação (renovação é cobrança automática sobre a
  // assinatura já criada, não um novo checkout). Gatilho de provisionamento.
  if (evento === "CHECKOUT_PAID" && typeof checkout?.subscription === "string") {
    return { tipo: "checkout_pago", assinaturaExternaId: checkout.subscription };
  }

  // PAYMENT_CONFIRMED/PAYMENT_RECEIVED numa assinatura já provisionada —
  // renovação mensal confirmada, ou a própria cobrança inicial chegando
  // depois do CHECKOUT_PAID (recupera de um eventual "inadimplente").
  if ((evento === "PAYMENT_CONFIRMED" || evento === "PAYMENT_RECEIVED") && typeof payment?.subscription === "string") {
    return { tipo: "pagamento_confirmado", assinaturaExternaId: payment.subscription };
  }

  if (evento === "PAYMENT_OVERDUE" && typeof payment?.subscription === "string") {
    return { tipo: "pagamento_atrasado", assinaturaExternaId: payment.subscription };
  }

  if (evento === "SUBSCRIPTION_CANCELED" && typeof subscription?.id === "string") {
    return { tipo: "assinatura_cancelada", assinaturaExternaId: subscription.id };
  }

  // Evento que não nos interessa (CHECKOUT_CREATED, PAYMENT_CREATED, etc.)
  // — ignorado, não é erro.
  return null;
}
