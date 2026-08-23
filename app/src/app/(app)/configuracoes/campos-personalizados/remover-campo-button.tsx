"use client";

import { useTransition } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { removerCampoPersonalizadoAction } from "@/lib/pessoas/pessoas-actions";

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
          await removerCampoPersonalizadoAction(formData);
        })
      }
    >
      {pendente ? "Removendo..." : "Remover"}
    </DropdownMenuItem>
  );
}
