"use client";

import { useActionState, useRef } from "react";
import { criarDespesa } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Categoria = { id: string; nome: string };

const estadoInicial = { erro: "" };

export function NovaDespesaForm({ categorias }: { categorias: Categoria[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await criarDespesa(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    formRef.current?.reset();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2"
    >
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Input id="descricao" name="descricao" type="text" required placeholder="Ex.: Aluguel do escritório" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="valor">Valor (R$)</Label>
        <Input id="valor" name="valor" type="text" inputMode="decimal" required placeholder="0,00" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="data_vencimento">Vencimento</Label>
        <Input id="data_vencimento" name="data_vencimento" type="date" required />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="categoria_id">Categoria</Label>
        <Select name="categoria_id" required>
          <SelectTrigger id="categoria_id" className="w-full">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {estado.erro && <p className="text-sm text-destructive sm:col-span-2">{estado.erro}</p>}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Registrar despesa"}
        </Button>
      </div>
    </form>
  );
}
