"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cancelarRegraRecorrenciaAction } from "@/lib/contabil/recorrencia-actions";

export function CancelarSerieButton({ regraId }: { regraId: string }) {
  const [pendente, iniciarTransicao] = useTransition();
  const router = useRouter();

  async function acionar() {
    const formData = new FormData();
    formData.set("regra_id", regraId);
    await cancelarRegraRecorrenciaAction(formData);
    router.refresh();
  }

  return (
    <DropdownMenuItem variant="destructive" disabled={pendente} onSelect={() => iniciarTransicao(acionar)}>
      {pendente ? "Cancelando..." : "Cancelar série"}
    </DropdownMenuItem>
  );
}
