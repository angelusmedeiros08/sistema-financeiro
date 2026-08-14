"use client";

import { useActionState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarContaContabilAction } from "@/lib/contabil/plano-contas-actions";
import type { ContaContabilComNivel } from "@/lib/contabil/plano-contas";

const estadoInicial = { erro: "" };

const OPCOES_TIPO = [
  { valor: "ATIVO", rotulo: "Ativo" },
  { valor: "PASSIVO", rotulo: "Passivo" },
  { valor: "PATRIMONIO_LIQUIDO", rotulo: "Patrimônio líquido" },
  { valor: "RECEITA", rotulo: "Receita" },
  { valor: "DESPESA", rotulo: "Despesa" },
] as const;

const OPCOES_NATUREZA = [
  { valor: "DEVEDORA", rotulo: "Devedora" },
  { valor: "CREDORA", rotulo: "Credora" },
] as const;

export function NovaContaForm({ contas }: { contas: ContaContabilComNivel[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await criarContaContabilAction(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    formRef.current?.reset();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl border border-border bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1.5">
          <Label htmlFor="codigo">Código</Label>
          <Input id="codigo" name="codigo" type="text" required placeholder="Ex.: 4.1.5" />
        </div>
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" type="text" required placeholder="Ex.: Despesas com Marketing" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Select name="tipo" required defaultValue="DESPESA">
            <SelectTrigger id="tipo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPCOES_TIPO.map((t) => (
                <SelectItem key={t.valor} value={t.valor}>
                  {t.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="natureza">Natureza</Label>
          <Select name="natureza" required defaultValue="DEVEDORA">
            <SelectTrigger id="natureza" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPCOES_NATUREZA.map((n) => (
                <SelectItem key={n.valor} value={n.valor}>
                  {n.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="conta_pai_id">Conta pai</Label>
          <Select name="conta_pai_id">
            <SelectTrigger id="conta_pai_id" className="w-full">
              <SelectValue placeholder="Nenhuma (raiz)" />
            </SelectTrigger>
            <SelectContent>
              {contas.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.codigo} — {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="max-w-xs flex-1 space-y-1.5">
          <Label htmlFor="codigo_referencial_sped">Código referencial SPED (opcional)</Label>
          <Input id="codigo_referencial_sped" name="codigo_referencial_sped" type="text" placeholder="Ex.: 4.01.01.001" />
        </div>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Adicionar conta"}
        </Button>
      </div>

      {estado.erro && <p className="mt-2 text-sm text-destructive">{estado.erro}</p>}
    </form>
  );
}
