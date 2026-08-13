"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { definirAcessoUsuarioAction } from "@/lib/tenant/equipe-actions";

export function AcessoToggleButton({ usuarioId, ativo }: { usuarioId: string; ativo: boolean }) {
  const [pendente, iniciarTransicao] = useTransition();

  async function acionar() {
    const formData = new FormData();
    formData.set("usuario_id", usuarioId);
    formData.set("ativo", String(!ativo));
    await definirAcessoUsuarioAction(formData);
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className={ativo ? "text-destructive" : undefined}
      disabled={pendente}
      onClick={() => iniciarTransicao(acionar)}
    >
      {pendente ? "..." : ativo ? "Revogar" : "Reativar"}
    </Button>
  );
}
