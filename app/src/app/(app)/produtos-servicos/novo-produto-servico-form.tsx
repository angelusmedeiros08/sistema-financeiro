"use client";

import { useActionState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarProdutoServicoAction } from "@/lib/produtos-servicos/produtos-servicos-actions";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

const estadoInicial = { erro: "" };

export function NovoProdutoServicoForm({ categoriasReceita }: { categoriasReceita: { id: string; nome: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  const [, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await criarProdutoServicoAction(formData);
    notificarResultado(resultado, "Item criado.");
    if ("erro" in resultado) return { erro: resultado.erro };
    formRef.current?.reset();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl bg-card shadow-card p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" type="text" required placeholder="Ex.: Consultoria mensal" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Select name="tipo" defaultValue="SERVICO">
            <SelectTrigger id="tipo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SERVICO">Serviço</SelectItem>
              <SelectItem value="PRODUTO">Produto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="preco_venda">Preço de venda</Label>
          <Input id="preco_venda" name="preco_venda" type="text" inputMode="decimal" required placeholder="0,00" />
        </div>
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="categoria_financeira_id">Categoria de receita</Label>
          <Select name="categoria_financeira_id" required>
            <SelectTrigger id="categoria_financeira_id" className="w-full">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {categoriasReceita.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="unidade_medida">Unidade (opcional)</Label>
          <Input id="unidade_medida" name="unidade_medida" type="text" placeholder="Ex.: hora, un, kg" />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-xs text-muted-foreground">Descrição e código de referência podem ser preenchidos depois, editando o item.</div>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Adicionar item"}
        </Button>
      </div>
    </form>
  );
}
