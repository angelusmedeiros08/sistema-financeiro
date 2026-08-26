"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise, Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { retomarImportacaoAction } from "../actions";

// Sem prop `tipo` de propósito — o servidor deriva do próprio registro
// (achado em revisão de código: um tipo vindo do cliente podia rodar o
// commit errado sobre o item errado). Um clique dispara UMA Server Action
// que roda o lote inteiro de retomada; sair da tela no meio não interrompe
// nada, mesmo raciocínio já aplicado à importação normal.
export function RetomarPainel({ importacaoId, contagemPendente }: { importacaoId: string; contagemPendente: number }) {
  const router = useRouter();
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState("");

  async function retomar() {
    setErro("");
    setRodando(true);
    try {
      const resposta = await retomarImportacaoAction(importacaoId);
      if ("erro" in resposta) {
        setErro(resposta.erro);
        return;
      }
      router.refresh();
    } catch {
      setErro("Falha inesperada ao retomar a importação. Tente de novo.");
    } finally {
      setRodando(false);
    }
  }

  if (rodando) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Spinner size={12} className="shrink-0 animate-spin" />
        Retomando... isso pode levar alguns segundos. Não feche nem saia desta página até terminar.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={retomar}>
        <ArrowClockwise size={14} />
        Retomar {contagemPendente} linha{contagemPendente > 1 ? "s" : ""}
      </Button>
      {erro && (
        <p role="alert" className="text-xs text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
