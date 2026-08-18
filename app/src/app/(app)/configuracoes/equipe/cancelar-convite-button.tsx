"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelarConviteAction } from "@/lib/tenant/equipe-actions";

export function CancelarConviteButton({ usuarioId }: { usuarioId: string }) {
  const [pendente, iniciarTransicao] = useTransition();

  async function acionar() {
    if (!confirm("Cancelar esse convite? O e-mail fica livre pra convidar de novo.")) return;
    const formData = new FormData();
    formData.set("usuario_id", usuarioId);
    await cancelarConviteAction(formData);
  }

  return (
    <Button size="sm" variant="outline" className="text-destructive" disabled={pendente} onClick={() => iniciarTransicao(acionar)}>
      {pendente ? "..." : "Cancelar convite"}
    </Button>
  );
}
