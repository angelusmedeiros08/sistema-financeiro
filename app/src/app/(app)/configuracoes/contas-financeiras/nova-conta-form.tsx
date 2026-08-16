"use client";

import { useActionState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BancoCombobox } from "@/components/formularios/banco-combobox";
import { criarContaFinanceira } from "./actions";

const estadoInicial = { erro: "" };

export function NovaContaFinanceiraForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await criarContaFinanceira(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    formRef.current?.reset();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl border border-border bg-card p-5">
      <div className="grid grid-cols-[1fr_140px_1fr_140px_auto] items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" type="text" required placeholder="Ex.: Banco do Brasil CC" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Select name="tipo" defaultValue="BANCO">
            <SelectTrigger id="tipo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BANCO">Conta bancária</SelectItem>
              <SelectItem value="CAIXA">Caixa</SelectItem>
              <SelectItem value="CARTEIRA_DIGITAL">Carteira digital</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Banco (opcional)</Label>
          <BancoCombobox />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="saldo_inicial">Saldo inicial</Label>
          <Input id="saldo_inicial" name="saldo_inicial" type="number" step="0.01" defaultValue="0" />
        </div>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Adicionar"}
        </Button>
      </div>
      {estado.erro && <p className="mt-2 text-sm text-destructive">{estado.erro}</p>}
    </form>
  );
}
