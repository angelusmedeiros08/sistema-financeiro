"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    <Button size="sm" variant="outline" className="text-destructive" disabled={pendente} onClick={() => iniciarTransicao(acionar)}>
      {pendente ? "Cancelando..." : "Cancelar série"}
    </Button>
  );
}
