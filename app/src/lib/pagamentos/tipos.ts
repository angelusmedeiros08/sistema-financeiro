// Formato neutro de evento de pagamento — a única coisa que o resto do
// sistema (webhook handler, provisionamento, gate de acesso) enxerga.
// Nenhum fornecedor de pagamento é conhecido fora de lib/<fornecedor>/ — ver
// spec docs/superpowers/specs/2026-08-23-checkout-assinatura-provisionamento-design.md,
// seção "Princípio: o Asaas fica isolado, não espalhado".
//
// Revisão de 29/08/2026 (implementação do webhook, auditoria de segurança):
// a spec original previa `ehPrimeiroPagamento` calculado a partir do evento
// de pagamento (PAYMENT_CONFIRMED/RECEIVED) — mas o Asaas não expõe esse
// dado no payload de cobrança, e checar "já existe tenant pra essa
// assinatura" é frágil (depende de uma consulta extra e ainda deixa
// ambíguo o caso trial-via-cartão, onde a primeira cobrança de verdade só
// acontece dias depois do checkout). `checkout_pago` (evento CHECKOUT_PAID,
// que o Asaas recomenda especificamente pra "confirmar pagamento e
// atualizar assinatura/serviço") dispara UMA VEZ só, na conclusão do
// checkout — nunca se repete numa renovação — então é o gatilho natural de
// provisionamento, sem precisar inferir "é a primeira vez?" de jeito nenhum.
export type EventoPagamento =
  | { tipo: "checkout_pago"; assinaturaExternaId: string }
  | { tipo: "pagamento_confirmado"; assinaturaExternaId: string }
  | { tipo: "pagamento_atrasado"; assinaturaExternaId: string }
  | { tipo: "assinatura_cancelada"; assinaturaExternaId: string };
