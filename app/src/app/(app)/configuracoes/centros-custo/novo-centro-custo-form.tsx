"use client";

import { useActionState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { criarCentroCusto } from "./actions";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

const estadoInicial = { erro: "" };

export function NovoCentroCustoForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await criarCentroCusto(formData);
    notificarResultado(resultado, "Centro de custo criado.");
    if ("erro" in resultado) return { erro: resultado.erro };
    formRef.current?.reset();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl bg-card shadow-card p-5">
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_140px_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" type="text" required placeholder="Ex.: Filial Centro" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="codigo">Código (opcional)</Label>
          <Input id="codigo" name="codigo" type="text" placeholder="Ex.: CC-01" />
        </div>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}
