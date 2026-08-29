// Plano único (spec: múltiplos planos/tiers ficam pra um ciclo futuro).
// VALOR ainda é placeholder — não foi definido em nenhuma conversa com o
// usuário até agora. Confirmar o valor real antes de qualquer teste com
// dinheiro de verdade (mesmo sandbox usa esse valor no Checkout gerado).
export const VALOR_PLANO_MENSAL = 197;
export const DESCRICAO_PLANO = "Assinatura Finanssi — mensal";
export const TRIAL_DIAS = 7;

// Fonte única do gate de acesso — achado CRÍTICO em auditoria de segurança
// (29/08/2026): nenhuma camada verificava assinatura/trial antes disso,
// então um tenant com trial vencido ou assinatura cancelada tinha acesso
// irrestrito. Usada por (app)/layout.tsx e (portal)/layout.tsx — os dois
// precisam bloquear igual, já que é o mesmo serviço sendo pago pelo tenant.
// Bloqueio é imediato (sem carência) pra inadimplente/cancelado, por
// decisão explícita do usuário — dados nunca são apagados, só ficam
// inacessíveis até regularizar.
export function acessoLiberado(
  statusAssinatura: "trial" | "ativo" | "inadimplente" | "cancelado" | null,
  trialTerminaEm: string | null,
): boolean {
  if (statusAssinatura === "ativo") return true;
  if (statusAssinatura === "trial") return !trialTerminaEm || new Date(trialTerminaEm) > new Date();
  return false;
}
