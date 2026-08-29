"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, WarningCircle, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarMoeda } from "@/lib/formatacao";
import { normalizarTexto } from "@/lib/importacao/locale-br";
import { validarLinhasProduto } from "@/lib/importacao/produtos/validacao";
import type { ProdutoExistente } from "@/lib/importacao/produtos/correspondencia";
import type { DecisaoLinhaProduto, LinhaBrutaProduto, LinhaValidadaProduto } from "@/lib/importacao/produtos/tipos";
import type { ResolucaoEntidade } from "@/lib/importacao/tipos";
import type { LinhaParaImportarProduto } from "./actions";
import { cn } from "@/lib/utils";

export type LinhaPronta = LinhaParaImportarProduto;

// "código exato"/"aproximada" com 1 único candidato decide sozinho — mesma
// régua de decisaoPadrao em pessoas/passo-revisao.tsx (documento no lugar
// de código). "nenhuma"/"fraca" pré-preenche "criar novo" (fraca é só uma
// dica visual, não impede criar). "exata_nome" e "codigo_conflito" nunca
// pré-decidem — nome sozinho pode ser produto genuinamente diferente.
function decisaoPadrao(l: LinhaValidadaProduto): DecisaoLinhaProduto {
  if (l.status === "erro") return null;
  const { tipo, candidatos } = l.correspondencia;
  const decideSozinho = (tipo === "exata_codigo" || tipo === "aproximada") && candidatos.length === 1;
  if (decideSozinho) return { acao: "atualizar", produtoId: candidatos[0].id };
  if (tipo === "nenhuma" || tipo === "fraca") return { acao: "criar", produtoId: null };
  return null;
}

export function PassoRevisao({
  linhasBrutas,
  produtosExistentes,
  resolucaoCategoria,
  onVoltar,
  onImportar,
}: {
  linhasBrutas: LinhaBrutaProduto[];
  produtosExistentes: ProdutoExistente[];
  resolucaoCategoria: Map<string, ResolucaoEntidade>;
  onVoltar: () => void;
  onImportar: (linhas: LinhaPronta[]) => void;
}) {
  const [linhas, setLinhas] = useState<LinhaValidadaProduto[]>(() => validarLinhasProduto(linhasBrutas, produtosExistentes, resolucaoCategoria));

  const [decisoes, setDecisoes] = useState<Record<number, DecisaoLinhaProduto>>(() => {
    const inicial: Record<number, DecisaoLinhaProduto> = {};
    for (const l of linhas) inicial[l.linha] = decisaoPadrao(l);
    return inicial;
  });
  const [incluidas, setIncluidas] = useState<Set<number>>(() => new Set(linhas.filter((l) => decisaoPadrao(l) !== null).map((l) => l.linha)));

  function editarCampo(linhaNum: number, campo: "nome" | "tipo" | "precoVenda" | "codigoReferencia", texto: string) {
    setLinhas((atual) => {
      const atualizadas = atual.map((l) => (l.linha === linhaNum ? { ...l, [campo]: texto } : l));
      const revalidadas = validarLinhasProduto(atualizadas, produtosExistentes, resolucaoCategoria);
      const linhaRevalidada = revalidadas.find((l) => l.linha === linhaNum)!;
      const decisao = decisaoPadrao(linhaRevalidada);
      setDecisoes((d) => ({ ...d, [linhaNum]: decisao }));
      setIncluidas((inc) => {
        const novo = new Set(inc);
        if (decisao) novo.add(linhaNum);
        else novo.delete(linhaNum);
        return novo;
      });
      return revalidadas;
    });
  }

  function mudarDecisao(linhaNum: number, decisao: DecisaoLinhaProduto) {
    setDecisoes((d) => ({ ...d, [linhaNum]: decisao }));
    setIncluidas((inc) => new Set(inc).add(linhaNum));
  }

  function alternarInclusao(linhaNum: number) {
    setIncluidas((atual) => {
      const novo = new Set(atual);
      if (novo.has(linhaNum)) novo.delete(linhaNum);
      else novo.add(linhaNum);
      return novo;
    });
  }

  const prontas = useMemo(() => linhas.filter((l) => l.status !== "erro" && decisoes[l.linha] && incluidas.has(l.linha)), [linhas, decisoes, incluidas]);
  const precisamConfirmar = linhas.filter((l) => l.status !== "erro" && !decisoes[l.linha]);
  const comErro = linhas.filter((l) => l.status === "erro");

  function importar() {
    const linhasProntas: LinhaPronta[] = prontas.map((l) => {
      const decisao = decisoes[l.linha]!;
      const categoriaId = resolucaoCategoria.get(normalizarTexto(l.categoria))?.entidadeId ?? "";
      return {
        linhaNumero: l.linha,
        acao: decisao.acao,
        produtoIdExistente: decisao.produtoId,
        nome: l.nome.trim(),
        tipo: l.tipoResolvido!,
        descricao: l.descricao.trim() || null,
        precoVenda: l.precoVendaNumero!,
        categoriaFinanceiraId: categoriaId,
        unidadeMedida: l.unidadeMedida.trim() || null,
        codigoReferencia: l.codigoReferencia.trim() || null,
      };
    });
    onImportar(linhasProntas);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card shadow-card p-6">
      <div>
        <h2 className="text-sm font-bold text-foreground">4. Confira cada linha antes de importar</h2>
        <p className="mt-1 text-sm text-muted-foreground">Corrija nome, tipo, preço ou código direto na grade — não precisa reenviar o arquivo.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm">
        <span className="flex items-center gap-1 font-medium text-positivo-foreground">
          <CheckCircle size={15} weight="fill" />
          {prontas.length} prontas
        </span>
        <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
          <WarningCircle size={15} weight="fill" />
          {precisamConfirmar.length} aguardando confirmação
        </span>
        <span className="flex items-center gap-1 font-medium text-destructive">
          <XCircle size={15} weight="fill" />
          {comErro.length} com erro
        </span>
      </div>

      <div className="max-h-[32rem] overflow-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => {
              const decisao = decisoes[l.linha];
              const idsCandidatos = new Set(l.correspondencia.candidatos.map((c) => c.id));
              const opcoesProduto = [...l.correspondencia.candidatos, ...produtosExistentes.filter((p) => !idsCandidatos.has(p.id))];
              const valorSelect = decisao ? (decisao.acao === "criar" ? "__criar__" : (decisao.produtoId ?? "")) : "";

              return (
                <TableRow key={l.linha} className={cn(l.status === "erro" && "bg-destructive/5")}>
                  <TableCell>
                    <Checkbox checked={incluidas.has(l.linha)} disabled={l.status === "erro" || !decisao} onCheckedChange={() => alternarInclusao(l.linha)} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.linha}</TableCell>
                  <TableCell>
                    {l.status === "erro" ? (
                      <XCircle size={16} weight="fill" className="text-destructive" />
                    ) : l.status === "precisa_confirmar" ? (
                      <WarningCircle size={16} weight="fill" className="text-amber-600 dark:text-amber-400" />
                    ) : (
                      <CheckCircle size={16} weight="fill" className="text-positivo" />
                    )}
                    {l.erros.length > 0 && (
                      <p className="mt-0.5 max-w-40 truncate text-xs text-muted-foreground" title={l.erros.join(" ")}>
                        {l.erros.join(" ")}
                      </p>
                    )}
                    {l.avisos.length > 0 && (
                      <p className="mt-0.5 max-w-40 truncate text-xs text-amber-700 dark:text-amber-400" title={l.avisos.join(" ")}>
                        {l.avisos.join(" ")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input className="h-7 w-36 text-xs" value={l.nome} onChange={(e) => editarCampo(l.linha, "nome", e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-7 w-24 text-xs" value={l.tipo} onChange={(e) => editarCampo(l.linha, "tipo", e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-7 w-24 text-xs" value={l.precoVenda} onChange={(e) => editarCampo(l.linha, "precoVenda", e.target.value)} />
                    {l.precoVendaNumero !== null && <p className="mt-0.5 text-xs text-muted-foreground">{formatarMoeda(l.precoVendaNumero)}</p>}
                  </TableCell>
                  <TableCell>
                    <Input className="h-7 w-24 text-xs" value={l.codigoReferencia} onChange={(e) => editarCampo(l.linha, "codigoReferencia", e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={valorSelect}
                      onValueChange={(v) =>
                        mudarDecisao(l.linha, v === "__criar__" ? { acao: "criar", produtoId: null } : { acao: "atualizar", produtoId: v })
                      }
                    >
                      <SelectTrigger className="h-7 w-40 text-xs">
                        <SelectValue placeholder="Escolher..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__criar__">Criar novo produto</SelectItem>
                        {opcoesProduto.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            Usar &quot;{p.nome}&quot;
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="ghost" className="gap-1.5" onClick={onVoltar}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
        <Button type="button" disabled={prontas.length === 0} onClick={importar}>
          Importar {prontas.length} {prontas.length === 1 ? "linha" : "linhas"}
        </Button>
      </div>
    </div>
  );
}
