"use client";

import { useActionState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarCategoriaAction } from "@/lib/contabil/categorias-actions";
import type { Categoria } from "@/lib/contabil/categorias";

const estadoInicial = { erro: "" };

export function NovaCategoriaForm({
  tipo,
  categorias,
  contasContabeis,
}: {
  tipo: "RECEITA" | "DESPESA";
  categorias: Categoria[];
  contasContabeis: { id: string; codigo: string; nome: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const raizes = categorias.filter((c) => !c.categoriaPaiId);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    formData.set("tipo", tipo);
    const resultado = await criarCategoriaAction(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    formRef.current?.reset();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl bg-card shadow-card p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" type="text" required placeholder={tipo === "RECEITA" ? "Ex.: Honorários contratuais" : "Ex.: Aluguel do escritório"} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="conta_contabil_id">Conta contábil</Label>
          <Select name="conta_contabil_id" required>
            <SelectTrigger id="conta_contabil_id" className="w-full">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {contasContabeis.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.codigo} — {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoria_pai_id">Categoria pai (opcional)</Label>
          <Select name="categoria_pai_id">
            <SelectTrigger id="categoria_pai_id" className="w-full">
              <SelectValue placeholder="Nenhuma" />
            </SelectTrigger>
            <SelectContent>
              {raizes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox name="eh_custo_fixo" />
          {tipo === "RECEITA" ? "Receita recorrente (entra no ponto de equilíbrio)" : "Custo/despesa fixa (entra no ponto de equilíbrio)"}
        </label>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Adicionar categoria"}
        </Button>
      </div>

      {estado.erro && <p className="mt-2 text-sm text-destructive">{estado.erro}</p>}
    </form>
  );
}
