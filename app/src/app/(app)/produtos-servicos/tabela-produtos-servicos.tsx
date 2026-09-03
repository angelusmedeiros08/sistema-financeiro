"use client";

import { useMemo, useState } from "react";
import { Check, PencilSimple, Spinner, X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabelaLista, criarColunaLista } from "@/components/tabela/tabela-lista";
import { formatarMoeda } from "@/lib/formatacao";
import type { ProdutoServico } from "@/lib/produtos-servicos/produtos-servicos";
import { editarProdutoServicoAction } from "@/lib/produtos-servicos/produtos-servicos-actions";
import { cn } from "@/lib/utils";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

const helper = criarColunaLista<ProdutoServico>();

export function TabelaProdutosServicos({
  produtosServicos,
  categoriasReceita,
  paginacao,
}: {
  produtosServicos: ProdutoServico[];
  categoriasReceita: { id: string; nome: string }[];
  /** Paginação real no servidor — `produtosServicos` já é só a página atual. Ver `paginacaoServidor` em TabelaLista. */
  paginacao?: { pagina: number; totalPaginas: number; totalRegistros: number; tamanhoPagina: number; hrefBase: string };
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<ProdutoServico["tipo"]>("SERVICO");
  const [preco, setPreco] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [ativo, setAtivo] = useState(true);

  function iniciarEdicao(p: ProdutoServico) {
    setEditandoId(p.id);
    setNome(p.nome);
    setTipo(p.tipo);
    setPreco(String(p.precoVenda).replace(".", ","));
    setCategoriaId(p.categoriaFinanceiraId);
    setAtivo(p.ativo);
  }

  async function salvar(produtoServico: ProdutoServico) {
    setEnviando(true);
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
    notificarResultado(resultado, "Item salvo.");
    if ("erro" in resultado) {
      return;
    }
    setEditandoId(null);
  }

  const colunas = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "nome",
          header: "Nome",
          cell: ({ row }) => {
            const p = row.original;
            if (editandoId !== p.id) return <span className={cn("font-medium text-foreground", !p.ativo && "opacity-50")}>{p.nome}</span>;
            return <Input className="h-8 text-sm" value={nome} onChange={(e) => setNome(e.target.value)} />;
          },
        }),
        helper.display({
          id: "tipo",
          header: "Tipo",
          cell: ({ row }) => {
            const p = row.original;
            if (editandoId !== p.id)
              return (
                <Badge variant="outline" className="border-none bg-muted text-[10px] font-semibold text-muted-foreground">
                  {p.tipo === "SERVICO" ? "Serviço" : "Produto"}
                </Badge>
              );
            return (
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SERVICO">Serviço</SelectItem>
                  <SelectItem value="PRODUTO">Produto</SelectItem>
                </SelectContent>
              </Select>
            );
          },
        }),
        helper.display({
          id: "categoria",
          header: "Categoria",
          cell: ({ row }) => {
            const p = row.original;
            if (editandoId !== p.id) return <span className="text-muted-foreground">{p.categoriaFinanceiraNome}</span>;
            return (
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
            );
          },
        }),
        helper.display({
          id: "preco",
          header: "Preço",
          meta: { numerica: true },
          cell: ({ row }) => {
            const p = row.original;
            if (editandoId !== p.id) return <span className="tabular-nums text-foreground">{formatarMoeda(p.precoVenda)}</span>;
            return <Input className="h-8 w-24 text-right text-sm" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} />;
          },
        }),
        helper.display({
          id: "_acoes",
          header: "",
          cell: ({ row }) => {
            const p = row.original;
            if (editandoId !== p.id) {
              return (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => iniciarEdicao(p)}
                    aria-label="Editar"
                  >
                    <PencilSimple size={14} />
                  </Button>
                </div>
              );
            }
            return (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center justify-end gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox checked={ativo} onCheckedChange={(v) => setAtivo(v === true)} />
                    Ativo
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={enviando}
                    onClick={() => setEditandoId(null)}
                    aria-label="Cancelar edição"
                  >
                    <X size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={enviando}
                    onClick={() => salvar(p)}
                    aria-label="Salvar edição"
                  >
                    {enviando ? <Spinner size={13} className="animate-spin" /> : <Check size={14} />}
                  </Button>
                </div>
              </div>
            );
          },
        }),
      ]),
    [editandoId, nome, tipo, preco, categoriaId, ativo, enviando, categoriasReceita],
  );

  if (produtosServicos.length === 0 && !paginacao) {
    return <EstadoVazio texto="Nenhum produto ou serviço ainda." />;
  }

  return (
    <TabelaLista
      titulo="Produtos e serviços"
      data={produtosServicos}
      columns={colunas}
      busca={false}
      textoVazio="Nenhum produto ou serviço ainda."
      paginacaoServidor={paginacao}
    />
  );
}
