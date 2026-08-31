"use client";

import { useTransition } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { alternarAtivoContaFinanceira } from "./actions";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

export function ToggleAtivoContaButton({ id, ativo }: { id: string; ativo: boolean }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <DropdownMenuItem
      disabled={pendente}
      onSelect={() =>
        iniciarTransicao(async () => {
          const resultado = await alternarAtivoContaFinanceira(id, !ativo);
          notificarResultado(resultado, ativo ? "Conta financeira desativada." : "Conta financeira ativada.");
        })
      }
    >
      {ativo ? "Desativar" : "Ativar"}
    </DropdownMenuItem>
  );
}
