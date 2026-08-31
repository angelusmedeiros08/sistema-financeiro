"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { aplicarModeloCompletoDreAction } from "@/lib/relatorios/dre-actions";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

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
          const resultado = await aplicarModeloCompletoDreAction();
          notificarResultado(resultado, "Modelo aplicado.");
        });
      }}
    >
      {pendente ? "Aplicando..." : "Aplicar modelo completo"}
    </Button>
  );
}
