"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TrashSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { excluirApresentacao } from "./actions";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

export function ExcluirApresentacaoButton({ apresentacaoId, nome }: { apresentacaoId: string; nome: string }) {
  const [pendente, iniciarTransicao] = useTransition();
  const router = useRouter();

  function acionar() {
    if (!confirm(`Excluir a apresentação "${nome}"? Essa ação não pode ser desfeita.`)) return;
    iniciarTransicao(async () => {
      // Sem o try/catch, uma falha na própria chamada (ex.: requisição
      // abortada pelo navegador) ficava sem nenhum retorno visível — o
      // botão voltava a ficar clicável, sem erro, parecendo que nada tinha
      // acontecido (achado reportado pelo usuário: "não está excluindo").
      try {
        const resultado = await excluirApresentacao(apresentacaoId);
        notificarResultado(resultado, "Apresentação excluída.");
        if ("erro" in resultado) return;
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? `Falha ao excluir: ${e.message}` : "Falha ao excluir — tente de novo.");
      }
    });
  }

  return (
    <Button variant="ghost" size="icon-sm" disabled={pendente} onClick={acionar} aria-label={`Excluir ${nome}`}>
      <TrashSimple size={15} />
    </Button>
  );
}
