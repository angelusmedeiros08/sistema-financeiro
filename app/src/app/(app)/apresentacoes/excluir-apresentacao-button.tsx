"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrashSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { excluirApresentacao } from "./actions";

export function ExcluirApresentacaoButton({ apresentacaoId, nome }: { apresentacaoId: string; nome: string }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState("");
  const router = useRouter();

  function acionar() {
    if (!confirm(`Excluir a apresentação "${nome}"? Essa ação não pode ser desfeita.`)) return;
    setErro("");
    iniciarTransicao(async () => {
      const resultado = await excluirApresentacao(apresentacaoId);
      if ("erro" in resultado) {
        setErro(resultado.erro);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon-sm" disabled={pendente} onClick={acionar} aria-label={`Excluir ${nome}`}>
        <TrashSimple size={15} />
      </Button>
      {erro && <p className="absolute top-full right-0 z-10 mt-1 w-48 text-right text-xs text-destructive">{erro}</p>}
    </div>
  );
}
