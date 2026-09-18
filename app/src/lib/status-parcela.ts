import { hojeIsoBrasil } from "./data-brasil";

// Fonte única do critério "está atrasada" — status persistido no banco
// nunca muda pra ATRASADO sozinho (só PENDENTE/RECEBIDO_PARCIAL/QUITADO via
// trigger), quem decide se uma parcela pendente já venceu é sempre a data de
// hoje comparada com o vencimento, calculado na hora de mostrar. Acha real
// em releitura tela por tela: cada tela que renderizava status de parcela
// tinha sua própria cópia (ou nenhuma) desse cálculo, e a mesma parcela
// aparecia "Pendente" numa tela e "Atrasado" em outra.
export function chaveStatusReal(status: string, dataVencimento: string | null): string {
  const atrasada = (status === "PENDENTE" || status === "RENEGOCIADO") && !!dataVencimento && dataVencimento < hojeIsoBrasil();
  return atrasada ? "ATRASADO" : status;
}

export const ROTULO_STATUS_PARCELA: Record<string, string> = {
  PENDENTE: "Pendente",
  QUITADO: "Quitado",
  CANCELADO: "Cancelado",
  RENEGOCIADO: "Renegociado",
  RECEBIDO_PARCIAL: "Parcial",
  ATRASADO: "Atrasado",
  PERDIDO: "Perdido",
};

export const COR_STATUS_PARCELA: Record<string, string> = {
  // Os tons claros (#96690F, #4F5C3A) só tinham contraste pensado pra fundo
  // claro — no tema escuro liam quase invisíveis sobre o card escuro
  // (achado em uso real, 03/09/2026). `dark:` troca pro tom claro da mesma
  // família, mesmo padrão que QUITADO/ATRASADO já seguem via token.
  PENDENTE: "bg-[#C98A1F]/12 text-[#96690F] dark:bg-[#C98A1F]/20 dark:text-[#F0BB4E]",
  QUITADO: "bg-positivo/12 text-positivo-foreground",
  // text-foreground (não text-muted-foreground): o par bg-muted +
  // text-muted-foreground ficava com contraste baixo demais contra o fundo
  // do card, lendo como "sem pill" mesmo sendo o mesmo componente Badge dos
  // outros status (achado em auditoria de UX).
  CANCELADO: "bg-muted text-foreground",
  RENEGOCIADO: "bg-[#7A8B5C]/12 text-[#4F5C3A] dark:bg-[#7A8B5C]/25 dark:text-[#B7C99A]",
  RECEBIDO_PARCIAL: "bg-[#C98A1F]/12 text-[#96690F] dark:bg-[#C98A1F]/20 dark:text-[#F0BB4E]",
  ATRASADO: "bg-destructive/12 text-destructive-foreground",
  PERDIDO: "bg-muted text-foreground",
};
