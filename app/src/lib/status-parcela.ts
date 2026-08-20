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
  PENDENTE: "bg-[#C98A1F]/12 text-[#96690F]",
  QUITADO: "bg-[#157F6B]/12 text-[#0F5F50]",
  CANCELADO: "bg-muted text-muted-foreground",
  RENEGOCIADO: "bg-[#7A8B5C]/12 text-[#4F5C3A]",
  RECEBIDO_PARCIAL: "bg-[#C98A1F]/12 text-[#96690F]",
  ATRASADO: "bg-[#B23A2E]/12 text-[#8A2E24]",
  PERDIDO: "bg-muted text-muted-foreground",
};
