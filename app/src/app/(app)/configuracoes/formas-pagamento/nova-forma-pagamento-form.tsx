"use client";

import { useActionState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { criarFormaPagamento } from "./actions";

const estadoInicial = { erro: "" };

export function NovaFormaPagamentoForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await criarFormaPagamento(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    formRef.current?.reset();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl bg-card shadow-card p-5">
      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" type="text" required placeholder="Ex.: Transferência bancária" />
        </div>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Adicionar"}
        </Button>
      </div>
      {estado.erro && <p className="mt-2 text-sm text-destructive">{estado.erro}</p>}
    </form>
  );
}
