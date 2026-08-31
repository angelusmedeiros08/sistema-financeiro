"use client";

import { useTransition } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { definirAcessoUsuarioAction } from "@/lib/tenant/equipe-actions";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

export function AcessoToggleButton({ usuarioId, ativo }: { usuarioId: string; ativo: boolean }) {
  const [pendente, iniciarTransicao] = useTransition();

  async function acionar() {
    const formData = new FormData();
    formData.set("usuario_id", usuarioId);
    formData.set("ativo", String(!ativo));
    const resultado = await definirAcessoUsuarioAction(formData);
    notificarResultado(resultado, ativo ? "Acesso revogado." : "Acesso reativado.");
  }

  return (
    <DropdownMenuItem variant={ativo ? "destructive" : "default"} disabled={pendente} onSelect={() => iniciarTransicao(acionar)}>
      {pendente ? "..." : ativo ? "Revogar acesso" : "Reativar acesso"}
    </DropdownMenuItem>
  );
}
