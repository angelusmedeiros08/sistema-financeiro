"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { alternarAtivoFormaPagamento } from "./actions";

export function ToggleAtivoButton({ id, ativo }: { id: string; ativo: boolean }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pendente}
      onClick={() =>
        iniciarTransicao(async () => {
          await alternarAtivoFormaPagamento(id, !ativo);
        })
      }
    >
      {ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}
