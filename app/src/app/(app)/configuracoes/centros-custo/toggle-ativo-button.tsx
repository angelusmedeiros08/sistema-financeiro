"use client";

import { useTransition } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { alternarAtivoCentroCusto } from "./actions";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

export function ToggleAtivoButton({ id, ativo }: { id: string; ativo: boolean }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <DropdownMenuItem
      disabled={pendente}
      onSelect={() =>
        iniciarTransicao(async () => {
          const resultado = await alternarAtivoCentroCusto(id, !ativo);
          notificarResultado(resultado, ativo ? "Centro de custo desativado." : "Centro de custo ativado.");
        })
      }
    >
      {ativo ? "Desativar" : "Ativar"}
    </DropdownMenuItem>
  );
}
