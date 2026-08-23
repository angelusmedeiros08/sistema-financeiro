"use client";

import { useActionState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarLinhaDreAction } from "@/lib/relatorios/dre-actions";

const estadoInicial = { erro: "" };

export const OPCOES_ID_DFC = [
  { valor: "OPERACIONAL_ENTRADA", rotulo: "Operacional (entrada)" },
  { valor: "OPERACIONAL_SAIDA", rotulo: "Operacional (saída)" },
  { valor: "NAO_OPERACIONAL_ENTRADA", rotulo: "Não operacional (entrada)" },
  { valor: "NAO_OPERACIONAL_SAIDA", rotulo: "Não operacional (saída)" },
  { valor: "INVESTIMENTO", rotulo: "Investimento" },
  { valor: "FINANCIAMENTO", rotulo: "Financiamento" },
] as const;

export function NovaLinhaDreForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await criarLinhaDreAction(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    formRef.current?.reset();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl bg-card shadow-card p-5">
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_160px_180px_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="rotulo">Rótulo da linha</Label>
          <Input id="rotulo" name="rotulo" type="text" required placeholder="Ex.: Despesas Comerciais" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tipo_calc">Tipo</Label>
          <Select name="tipo_calc" defaultValue="FOLHA">
            <SelectTrigger id="tipo_calc" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FOLHA">Folha (soma categorias)</SelectItem>
              <SelectItem value="SUBTOTAL">Subtotal (acumulado)</SelectItem>
              <SelectItem value="SUBTOTAL_ALTERNATIVO">Subtotal alternativo (rota paralela)</SelectItem>
              <SelectItem value="RESULTADO_NAO_OPERACIONAL">Resultado não operacional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="id_dfc">Atividade de DFC</Label>
          <Select name="id_dfc">
            <SelectTrigger id="id_dfc" className="w-full">
              <SelectValue placeholder="Nenhuma (não afeta caixa)" />
            </SelectTrigger>
            <SelectContent>
              {OPCOES_ID_DFC.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.rotulo}
                </SelectItem>
              ))}
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
