"use client";

import { useState } from "react";
import { Check, PencilSimple, Spinner, X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatarMoeda } from "@/lib/formatacao";
import type { ProdutoServico } from "@/lib/produtos-servicos/produtos-servicos";
import { editarProdutoServicoAction } from "@/lib/produtos-servicos/produtos-servicos-actions";
import { cn } from "@/lib/utils";

export function ProdutoServicoLinha({
  produtoServico,
  categoriasReceita,
}: {
  produtoServico: ProdutoServico;
  categoriasReceita: { id: string; nome: string }[];
}) {
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [nome, setNome] = useState(produtoServico.nome);
  const [tipo, setTipo] = useState(produtoServico.tipo);
  const [preco, setPreco] = useState(String(produtoServico.precoVenda).replace(".", ","));
  const [categoriaId, setCategoriaId] = useState(produtoServico.categoriaFinanceiraId);
  const [ativo, setAtivo] = useState(produtoServico.ativo);

  async function salvar() {
    setEnviando(true);
    setErro("");
    const formData = new FormData();
    formData.set("nome", nome);
    formData.set("tipo", tipo);
    formData.set("preco_venda", preco);
    formData.set("categoria_financeira_id", categoriaId);
    formData.set("unidade_medida", produtoServico.unidadeMedida ?? "");
    formData.set("codigo_referencia", produtoServico.codigoReferencia ?? "");
    if (ativo) formData.set("ativo", "on");

    const resultado = await editarProdutoServicoAction(produtoServico.id, formData);
    setEnviando(false);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    setEditando(false);
  }

  if (editando) {
    return (
      <TableRow>
        <TableCell>
          <Input className="h-8 text-sm" value={nome} onChange={(e) => setNome(e.target.value)} />
        </TableCell>
        <TableCell>
          <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SERVICO">Serviço</SelectItem>
              <SelectItem value="PRODUTO">Produto</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoriasReceita.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="text-right">
          <Input className="h-8 w-24 text-right text-sm" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} />
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Checkbox checked={ativo} onCheckedChange={(v) => setAtivo(v === true)} />
              Ativo
            </label>
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={enviando} onClick={() => setEditando(false)}>
              <X size={14} />
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" disabled={enviando} onClick={salvar}>
              {enviando ? <Spinner size={13} className="animate-spin" /> : <Check size={14} />}
            </Button>
          </div>
          {erro && <p className="mt-1 text-right text-xs text-destructive">{erro}</p>}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className={cn(!produtoServico.ativo && "opacity-50")}>
      <TableCell className="font-medium text-foreground">{produtoServico.nome}</TableCell>
      <TableCell>
        <Badge variant="outline" className="border-none bg-muted text-[10px] font-semibold text-muted-foreground">
          {produtoServico.tipo === "SERVICO" ? "Serviço" : "Produto"}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{produtoServico.categoriaFinanceiraNome}</TableCell>
      <TableCell className="text-right tabular-nums">{formatarMoeda(produtoServico.precoVenda)}</TableCell>
      <TableCell className="text-right">
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditando(true)}>
          <PencilSimple size={14} />
        </Button>
      </TableCell>
    </TableRow>
  );
}
