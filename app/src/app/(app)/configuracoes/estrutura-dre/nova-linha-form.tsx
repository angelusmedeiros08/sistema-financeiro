"use client";

import { useActionState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarLinhaDreAction } from "@/lib/relatorios/dre-actions";

const estadoInicial = { erro: "" };

export function NovaLinhaDreForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await criarLinhaDreAction(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    formRef.current?.reset();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl border border-border bg-card p-5">
      <div className="grid grid-cols-[1fr_160px_auto] items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="rotulo">Rótulo da linha</Label>
          <Input id="rotulo" name="rotulo" type="text" required placeholder="Ex.: Despesas Comerciais" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Select name="tipo" defaultValue="FOLHA">
            <SelectTrigger id="tipo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FOLHA">Folha (soma categorias)</SelectItem>
              <SelectItem value="SUBTOTAL">Subtotal (acumulado)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Adicionar linha"}
        </Button>
      </div>
      {estado.erro && <p className="mt-2 text-sm text-destructive">{estado.erro}</p>}
    </form>
  );
}
