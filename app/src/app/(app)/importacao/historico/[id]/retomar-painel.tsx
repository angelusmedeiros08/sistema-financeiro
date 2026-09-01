"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { IndicadorProcessando } from "@/components/ui/indicador-processando";
import { retomarImportacaoAction } from "../actions";

// Sem prop `tipo` de propósito — o servidor deriva do próprio registro
// (achado em revisão de código: um tipo vindo do cliente podia rodar o
// commit errado sobre o item errado). Um clique dispara UMA Server Action
// que roda o lote inteiro de retomada; sair da tela no meio não interrompe
// nada, mesmo raciocínio já aplicado à importação normal.
export function RetomarPainel({ importacaoId, contagemPendente }: { importacaoId: string; contagemPendente: number }) {
  const router = useRouter();
  const [rodando, setRodando] = useState(false);

  async function retomar() {
    setRodando(true);
    try {
      const resposta = await retomarImportacaoAction(importacaoId);
      if ("erro" in resposta) {
        toast.error(resposta.erro);
        return;
      }
      toast.success(`${resposta.processados} linha${resposta.processados !== 1 ? "s" : ""} retomada${resposta.processados !== 1 ? "s" : ""}.`);
      router.refresh();
    } catch {
      toast.error("Falha inesperada ao retomar a importação. Tente de novo.");
    } finally {
      setRodando(false);
    }
  }

  if (rodando) {
    return (
      <IndicadorProcessando
        titulo="Retomando..."
        descricao="Isso pode levar alguns segundos. Não feche nem saia desta página até terminar."
      />
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={retomar}>
        <ArrowClockwise size={14} />
        Retomar {contagemPendente} linha{contagemPendente > 1 ? "s" : ""}
      </Button>
    </div>
  );
}
