"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrashSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { excluirApresentacao } from "./actions";

export function ExcluirApresentacaoButton({ apresentacaoId, nome }: { apresentacaoId: string; nome: string }) {
  const [pendente, iniciarTransicao] = useTransition();
  const router = useRouter();

  function acionar() {
    if (!confirm(`Excluir a apresentação "${nome}"? Essa ação não pode ser desfeita.`)) return;
    iniciarTransicao(async () => {
      await excluirApresentacao(apresentacaoId);
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="icon-sm" disabled={pendente} onClick={acionar} aria-label={`Excluir ${nome}`}>
      <TrashSimple size={15} />
    </Button>
  );
}
