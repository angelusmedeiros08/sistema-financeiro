"use client";

import { useActionState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { criarCentroCusto } from "./actions";

const estadoInicial = { erro: "" };

export function NovoCentroCustoForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await criarCentroCusto(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    formRef.current?.reset();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl border border-border bg-card p-5">
      <div className="grid grid-cols-[1fr_140px_auto] items-end gap-3">
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
      {estado.erro && <p className="mt-2 text-sm text-destructive">{estado.erro}</p>}
    </form>
  );
}
