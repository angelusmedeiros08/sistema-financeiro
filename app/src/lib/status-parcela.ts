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
  RENEGOCIADO: "bg-[#6A56D8]/12 text-[#4C3BAD]",
  RECEBIDO_PARCIAL: "bg-[#C98A1F]/12 text-[#96690F]",
  ATRASADO: "bg-[#D8583A]/12 text-[#A8412A]",
  PERDIDO: "bg-muted text-muted-foreground",
};
