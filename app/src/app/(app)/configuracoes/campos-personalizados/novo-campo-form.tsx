"use client";

import { useActionState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarCampoPersonalizadoAction } from "@/lib/pessoas/pessoas-actions";

const estadoInicial = { erro: "" };

export function NovoCampoForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await criarCampoPersonalizadoAction(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    formRef.current?.reset();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl bg-card shadow-card p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_160px_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="rotulo">Rótulo</Label>
          <Input id="rotulo" name="rotulo" type="text" required placeholder="Ex.: Número da OAB" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Select name="tipo" defaultValue="TEXTO">
            <SelectTrigger id="tipo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TEXTO">Texto</SelectItem>
              <SelectItem value="NUMERO">Número</SelectItem>
              <SelectItem value="DATA">Data</SelectItem>
              <SelectItem value="BOOLEANO">Sim/Não</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="aplica_a">Aplica a</Label>
          <Select name="aplica_a" defaultValue="AMBOS">
            <SelectTrigger id="aplica_a" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AMBOS">Clientes e fornecedores</SelectItem>
              <SelectItem value="CLIENTE">Só clientes</SelectItem>
              <SelectItem value="FORNECEDOR">Só fornecedores</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Adicionar"}
        </Button>
      </div>
      {estado.erro && <p className="mt-2 text-sm text-destructive">{estado.erro}</p>}
    </form>
  );
}
