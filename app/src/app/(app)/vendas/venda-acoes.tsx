"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { aprovarVendaAction, recusarVendaAction } from "@/lib/vendas/vendas-actions";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";
import type { Database } from "@/utils/supabase/database.types";

type StatusVenda = Database["public"]["Enums"]["status_venda"];

export function VendaAcoes({ vendaId, status }: { vendaId: string; status: StatusVenda }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<"aprovar" | "recusar" | null>(null);

  async function executar(acao: "aprovar" | "recusar") {
    setEnviando(acao);
    const resultado = acao === "aprovar" ? await aprovarVendaAction(vendaId) : await recusarVendaAction(vendaId);
    setEnviando(null);
    notificarResultado(resultado, acao === "aprovar" ? "Venda aprovada." : "Venda recusada.");
    if ("erro" in resultado) return;
    router.refresh();
  }

  if (status !== "RASCUNHO") return null;

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={enviando !== null} onClick={() => executar("recusar")}>
        {enviando === "recusar" ? <Spinner size={14} className="animate-spin" /> : "Recusar"}
      </Button>
      <Button type="button" size="sm" disabled={enviando !== null} onClick={() => executar("aprovar")}>
        {enviando === "aprovar" ? <Spinner size={14} className="animate-spin" /> : "Aprovar"}
      </Button>
    </div>
  );
}
