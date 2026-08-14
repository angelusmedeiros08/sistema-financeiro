"use client";

import { useActionState, useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { editarCategoriaAction } from "@/lib/contabil/categorias-actions";
import type { Categoria } from "@/lib/contabil/categorias";

const estadoInicial = { erro: "" };

export function CategoriaLinha({
  categoria,
  raizes,
  contasContabeis,
  temFilhos,
}: {
  categoria: Categoria;
  raizes: Categoria[];
  contasContabeis: { id: string; codigo: string; nome: string }[];
  temFilhos: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const opcoesPai = raizes.filter((c) => c.id !== categoria.id);
  const ehGrupo = temFilhos && !categoria.categoriaPaiId;

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    formData.set("categoria_id", categoria.id);
    const resultado = await editarCategoriaAction(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    setEditando(false);
    return { erro: "" };
  }, estadoInicial);

  if (!editando) {
    return (
      <TableRow className={ehGrupo ? "bg-muted/40" : undefined}>
        <TableCell
          className={cn("text-foreground", ehGrupo ? "font-bold" : "font-medium")}
          style={{ paddingLeft: categoria.categoriaPaiId ? "32px" : "12px" }}
        >
          {categoria.nome}
        </TableCell>
        <TableCell className={cn("text-muted-foreground", ehGrupo && "font-bold")}>{categoria.contaContabilNome ?? "-"}</TableCell>
        <TableCell>
          {categoria.ehCustoFixo && <Badge className="border-none bg-[#6A56D8]/12 font-semibold text-[#4E3EAD]">Fixo</Badge>}
        </TableCell>
        <TableCell className="text-right">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(true)}>
            <PencilSimple size={14} />
            Editar
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell colSpan={4} className="whitespace-normal border-l-2 border-l-primary bg-muted/30 align-top">
        <form action={formAction} className="grid gap-3 py-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Nome</span>
            <Input name="nome" type="text" defaultValue={categoria.nome} required />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Conta contábil</span>
            <Select name="conta_contabil_id" defaultValue={categoria.contaContabilId ?? undefined}>
              <SelectTrigger className="w-full">
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
            <span className="text-xs font-semibold text-muted-foreground">Categoria pai</span>
            <Select name="categoria_pai_id" defaultValue={categoria.categoriaPaiId ?? undefined}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                {opcoesPai.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox name="eh_custo_fixo" defaultChecked={categoria.ehCustoFixo} />
              Fixo (ponto de equilíbrio)
            </label>
          </div>

          <div className="flex items-end gap-2 lg:col-span-4">
            <Button type="submit" size="sm" disabled={pendente}>
              {pendente ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(false)} disabled={pendente}>
              Cancelar
            </Button>
            {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}
          </div>
        </form>
      </TableCell>
    </TableRow>
  );
}
