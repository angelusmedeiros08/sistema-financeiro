"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { convidarUsuarioAction } from "@/lib/tenant/equipe-actions";

const PAPEIS = [
  { valor: "admin", rotulo: "Admin" },
  { valor: "financeiro_senior", rotulo: "Financeiro sênior" },
  { valor: "financeiro_junior", rotulo: "Financeiro júnior" },
  { valor: "contador", rotulo: "Contador" },
  { valor: "cliente_portal", rotulo: "Cliente (portal)" },
] as const;

const estadoInicial = { erro: "" };

export function ConvidarForm() {
  const [chaveFormulario, setChaveFormulario] = useState(0);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await convidarUsuarioAction(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    setChaveFormulario((k) => k + 1);
    return { erro: "" };
  }, estadoInicial);

  return (
    <form
      key={chaveFormulario}
      action={formAction}
      className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_220px_auto]"
    >
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required placeholder="colega@escritorio.com" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="papel">Papel</Label>
        <Select name="papel" defaultValue="financeiro_junior">
          <SelectTrigger id="papel" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAPEIS.map((p) => (
              <SelectItem key={p.valor} value={p.valor}>
                {p.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end">
        <Button type="submit" disabled={pendente} className="w-full sm:w-auto">
          {pendente ? "Convidando..." : "Convidar"}
        </Button>
      </div>

      {estado.erro && <p className="text-sm text-destructive sm:col-span-3">{estado.erro}</p>}
    </form>
  );
}
