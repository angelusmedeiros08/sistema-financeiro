"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { prepararRetomadaAction, retomarItemAction, finalizarRetomadaAction } from "../actions";

export function RetomarPainel({
  importacaoId,
  contagemPendente,
  tipo,
}: {
  importacaoId: string;
  contagemPendente: number;
  tipo: "financeiro" | "pessoas";
}) {
  const router = useRouter();
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState({ feitos: 0, total: 0 });
  const [erro, setErro] = useState("");

  async function retomar() {
    setErro("");
    setRodando(true);

    try {
      const preparo = await prepararRetomadaAction(importacaoId);
      if ("erro" in preparo) {
        setErro(preparo.erro);
        setRodando(false);
        return;
      }

      setProgresso({ feitos: 0, total: preparo.itens.length });
      for (let i = 0; i < preparo.itens.length; i++) {
        const item = preparo.itens[i];
        await retomarItemAction(item.id, item.dadosNormalizados, tipo);
        setProgresso({ feitos: i + 1, total: preparo.itens.length });
      }

      await finalizarRetomadaAction(importacaoId, "concluida", tipo);
      router.refresh();
    } catch {
      setErro("Falha inesperada ao retomar a importação. Tente de novo.");
    } finally {
      setRodando(false);
    }
  }

  if (rodando) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowClockwise size={14} className="animate-spin" />
        Retomando {progresso.feitos}/{progresso.total}...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={retomar}>
        <ArrowClockwise size={14} />
        Retomar {contagemPendente} linha{contagemPendente > 1 ? "s" : ""}
      </Button>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}
