"use client";

import { useTransition } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { alternarAtivoContaFinanceira } from "./actions";

export function ToggleAtivoContaButton({ id, ativo }: { id: string; ativo: boolean }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <DropdownMenuItem disabled={pendente} onSelect={() => iniciarTransicao(async () => { await alternarAtivoContaFinanceira(id, !ativo); })}>
      {ativo ? "Desativar" : "Ativar"}
    </DropdownMenuItem>
  );
}
