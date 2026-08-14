"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { aplicarModeloCompletoDreAction } from "@/lib/relatorios/dre-actions";

export function ModeloCompletoButton() {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pendente}
      onClick={() => {
        const confirmado = window.confirm(
          "Isso substitui a estrutura atual pela cascata brasileira padrão (Receita Bruta → ... → Lucro Líquido). As categorias já vinculadas às linhas atuais ficam órfãs. Continuar?",
        );
        if (!confirmado) return;
        iniciarTransicao(async () => {
          await aplicarModeloCompletoDreAction();
        });
      }}
    >
      {pendente ? "Aplicando..." : "Aplicar modelo completo"}
    </Button>
  );
}
