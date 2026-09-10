// Plano único (spec: múltiplos planos/tiers ficam pra um ciclo futuro).
// VALOR ainda é placeholder — não foi definido em nenhuma conversa com o
// usuário até agora. Confirmar o valor real antes de qualquer teste com
// dinheiro de verdade (mesmo sandbox usa esse valor no Checkout gerado).
export const VALOR_PLANO_MENSAL = 197;
export const DESCRICAO_PLANO = "Assinatura Finanssi — mensal";
// 4 dias, decisão provisória do usuário (09/09/2026) — revisitar com os
// sócios depois, não é definitivo.
export const TRIAL_DIAS = 4;

// Fonte única do tipo — antes repetido como literal em 6 arquivos
// diferentes, risco real de esquecer de atualizar algum ao adicionar
// `cancelamento_agendado` (achado ao implementar autoatendimento de
// assinatura, spec 2026-09-09).
export type StatusAssinatura = "trial" | "ativo" | "inadimplente" | "cancelado" | "cancelamento_agendado";

// Fonte única do gate de acesso — achado CRÍTICO em auditoria de segurança
// (29/08/2026): nenhuma camada verificava assinatura/trial antes disso,
// então um tenant com trial vencido ou assinatura cancelada tinha acesso
// irrestrito. Usada por (app)/layout.tsx e (portal)/layout.tsx — os dois
// precisam bloquear igual, já que é o mesmo serviço sendo pago pelo tenant.
// Bloqueio é imediato (sem carência) pra inadimplente/cancelado, por
// decisão explícita do usuário — dados nunca são apagados, só ficam
// inacessíveis até regularizar.
//
// `cancelamento_agendado` (autoatendimento de assinatura, 09/09/2026) é
// diferente: o tenant já pagou o ciclo atual e pediu pra não renovar, então
// mantém acesso até `acessoAte` (fim do período já pago) — mesmo mecanismo
// de `trialTerminaEm`, sem precisar de cron pra "expirar" o estado.
export function acessoLiberado(statusAssinatura: StatusAssinatura | null, trialTerminaEm: string | null, acessoAte?: string | null): boolean {
  if (statusAssinatura === "ativo") return true;
  if (statusAssinatura === "trial") return !trialTerminaEm || new Date(trialTerminaEm) > new Date();
  if (statusAssinatura === "cancelamento_agendado") return !!acessoAte && new Date(acessoAte) > new Date();
  return false;
}
