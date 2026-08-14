"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { alternarAtivoContaFinanceira } from "./actions";

export function ToggleAtivoContaButton({ id, ativo }: { id: string; ativo: boolean }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pendente}
      onClick={() =>
        iniciarTransicao(async () => {
          await alternarAtivoContaFinanceira(id, !ativo);
        })
      }
    >
      {ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}
