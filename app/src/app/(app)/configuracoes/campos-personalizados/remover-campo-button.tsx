"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removerCampoPersonalizadoAction } from "@/lib/pessoas/pessoas-actions";

export function RemoverCampoButton({ campoId }: { campoId: string }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={pendente}
      onClick={() =>
        iniciarTransicao(async () => {
          const formData = new FormData();
          formData.set("campo_id", campoId);
          await removerCampoPersonalizadoAction(formData);
        })
      }
    >
      {pendente ? "Removendo..." : "Remover"}
    </Button>
  );
}
