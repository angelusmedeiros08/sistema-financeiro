"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { aplicarModeloCompletoDreAction } from "@/lib/relatorios/dre-actions";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

// Confirmação via Dialog do próprio app (mesmo componente de CancelarDialog),
// não window.confirm() nativo — ação destrutiva (substitui a estrutura
// inteira de DRE) merece o modal temático, não o popup cinza do navegador,
// que também ignora o tema escuro (achado em varredura de melhorias).
export function ModeloCompletoButton() {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  function confirmar() {
    iniciarTransicao(async () => {
      const resultado = await aplicarModeloCompletoDreAction();
      notificarResultado(resultado, "Modelo aplicado.");
      setAberto(false);
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setAberto(true)}>
        Aplicar modelo completo
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar modelo completo de DRE</DialogTitle>
            <DialogDescription>
              Isso substitui a estrutura atual pela cascata brasileira padrão (Receita Bruta → ... → Lucro Líquido). As
              categorias já vinculadas às linhas atuais ficam órfãs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)} disabled={pendente}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={confirmar} disabled={pendente}>
              {pendente ? "Aplicando..." : "Aplicar modelo completo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
