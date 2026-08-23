"use client";

import { useTransition } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { alternarAtivoCentroCusto } from "./actions";

export function ToggleAtivoButton({ id, ativo }: { id: string; ativo: boolean }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <DropdownMenuItem disabled={pendente} onSelect={() => iniciarTransicao(async () => { await alternarAtivoCentroCusto(id, !ativo); })}>
      {ativo ? "Desativar" : "Ativar"}
    </DropdownMenuItem>
  );
}
