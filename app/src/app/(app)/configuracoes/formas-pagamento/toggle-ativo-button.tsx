"use client";

import { useTransition } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { alternarAtivoFormaPagamento } from "./actions";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

export function ToggleAtivoButton({ id, ativo }: { id: string; ativo: boolean }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <DropdownMenuItem
      disabled={pendente}
      onSelect={() =>
        iniciarTransicao(async () => {
          const resultado = await alternarAtivoFormaPagamento(id, !ativo);
          notificarResultado(resultado, ativo ? "Forma de pagamento desativada." : "Forma de pagamento ativada.");
        })
      }
    >
      {ativo ? "Desativar" : "Ativar"}
    </DropdownMenuItem>
  );
}
