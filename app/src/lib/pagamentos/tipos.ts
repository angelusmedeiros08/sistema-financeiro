// Formato neutro de evento de pagamento — a única coisa que o resto do
// sistema (webhook handler, provisionamento, middleware de status) enxerga.
// Nenhum fornecedor de pagamento é conhecido fora de lib/<fornecedor>/ — ver
// spec docs/superpowers/specs/2026-08-23-checkout-assinatura-provisionamento-design.md,
// seção "Princípio: o Asaas fica isolado, não espalhado".
export type EventoPagamento =
  | { tipo: "pagamento_confirmado"; assinaturaExternaId: string; ehPrimeiroPagamento: boolean }
  | { tipo: "pagamento_atrasado"; assinaturaExternaId: string }
  | { tipo: "assinatura_cancelada"; assinaturaExternaId: string };
