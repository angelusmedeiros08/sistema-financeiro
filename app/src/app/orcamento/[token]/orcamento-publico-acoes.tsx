"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aprovarOrcamentoPublicoAction, recusarOrcamentoPublicoAction } from "./actions";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

export function OrcamentoPublicoAcoes({ token }: { token: string }) {
  const router = useRouter();
  const [mostrarRecusa, setMostrarRecusa] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState<"aprovar" | "recusar" | null>(null);

  async function aprovar() {
    setEnviando("aprovar");
    const resultado = await aprovarOrcamentoPublicoAction(token);
    setEnviando(null);
    notificarResultado(resultado, "Orçamento aprovado. Obrigado!");
    if ("erro" in resultado) return;
    router.refresh();
  }

  async function recusar() {
    setEnviando("recusar");
    const resultado = await recusarOrcamentoPublicoAction(token, motivo);
    setEnviando(null);
    notificarResultado(resultado, "Recusa registrada. Obrigado por avisar.");
    if ("erro" in resultado) return;
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {mostrarRecusa && (
        <Textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo da recusa (opcional)"
          className="text-sm"
          rows={3}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {!mostrarRecusa ? (
          <Button type="button" variant="outline" disabled={enviando !== null} onClick={() => setMostrarRecusa(true)}>
            Recusar
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled={enviando !== null} onClick={recusar}>
            {enviando === "recusar" ? <Spinner size={14} className="animate-spin" /> : "Confirmar recusa"}
          </Button>
        )}
        <Button type="button" disabled={enviando !== null} onClick={aprovar}>
          {enviando === "aprovar" ? <Spinner size={14} className="animate-spin" /> : "Aprovar orçamento"}
        </Button>
      </div>
    </div>
  );
}
