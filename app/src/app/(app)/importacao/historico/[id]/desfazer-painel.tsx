"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { desfazerImportacaoAction } from "../actions";

type Resultado = { removidas: number; protegidas: { pessoa_id: string; nome: string }[] };

export function DesfazerPainel({ importacaoId, contagemAtiva }: { importacaoId: string; contagemAtiva: number }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [rodando, setRodando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");

  async function desfazer() {
    setErro("");
    setRodando(true);

    let resposta: Resultado | { erro: string };
    try {
      resposta = await desfazerImportacaoAction(importacaoId);
    } catch {
      resposta = { erro: "Falha inesperada ao desfazer a importação. Tente de novo." };
    }

    setRodando(false);
    setConfirmando(false);

    if ("erro" in resposta) {
      setErro(resposta.erro);
      return;
    }

    setResultado(resposta);
    router.refresh();
  }

  if (confirmando) {
    return (
      <div className="flex max-w-sm flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
        <div className="flex gap-2">
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-destructive" />
          <p className="text-xs text-foreground">
            Isso vai avaliar {contagemAtiva} pessoa{contagemAtiva > 1 ? "s" : ""} criada{contagemAtiva > 1 ? "s" : ""} por esta importação. As que já têm
            lançamento financeiro vinculado ficam protegidas — não são removidas. Atualizações em cadastros já existentes não são desfeitas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="destructive" disabled={rodando} onClick={desfazer}>
            {rodando ? "Desfazendo..." : "Confirmar exclusão"}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={rodando} onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {contagemAtiva > 0 && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => setConfirmando(true)}>
          <Trash size={14} />
          Desfazer importação
        </Button>
      )}
      {erro && <p className="text-xs text-destructive">{erro}</p>}
      {resultado && (
        <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            {resultado.removidas} pessoa{resultado.removidas !== 1 ? "s" : ""} removida{resultado.removidas !== 1 ? "s" : ""}.
          </p>
          {resultado.protegidas.length > 0 && (
            <>
              <p className="mt-1.5">{resultado.protegidas.length} ficaram protegidas (já usadas em lançamentos):</p>
              <ul className="mt-1 list-disc pl-4">
                {resultado.protegidas.map((p) => (
                  <li key={p.pessoa_id}>{p.nome}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
