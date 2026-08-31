"use client";

import { useTransition } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { removerCampoPersonalizadoAction } from "@/lib/pessoas/pessoas-actions";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

export function RemoverCampoButton({ campoId }: { campoId: string }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <DropdownMenuItem
      variant="destructive"
      disabled={pendente}
      onSelect={() =>
        iniciarTransicao(async () => {
          const formData = new FormData();
          formData.set("campo_id", campoId);
          const resultado = await removerCampoPersonalizadoAction(formData);
          notificarResultado(resultado, "Campo removido.");
        })
      }
    >
      {pendente ? "Removendo..." : "Remover"}
    </DropdownMenuItem>
  );
}
