"use client";

import { useState } from "react";
import { Check, PencilSimple, Spinner, Trash, X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RegraCategorizacao } from "@/lib/conciliacao/regras";
import { editarRegraAction, apagarRegraAction } from "./actions";
import { cn } from "@/lib/utils";

const SEM_PESSOA = "__sem_pessoa__";

export function TabelaRegras({
  regrasIniciais,
  categorias,
  pessoas,
}: {
  regrasIniciais: RegraCategorizacao[];
  categorias: { id: string; nome: string; tipo: string }[];
  pessoas: { id: string; nome: string }[];
}) {
  const [regras, setRegras] = useState(regrasIniciais);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [categoriaEdicao, setCategoriaEdicao] = useState("");
  const [pessoaEdicao, setPessoaEdicao] = useState(SEM_PESSOA);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  function iniciarEdicao(regra: RegraCategorizacao) {
    setEditandoId(regra.id);
    setCategoriaEdicao(regra.categoriaId);
    setPessoaEdicao(regra.pessoaId ?? SEM_PESSOA);
    setErro("");
  }

  async function salvarEdicao(regraId: string) {
    setEnviando(true);
    setErro("");
    const resultado = await editarRegraAction(regraId, { categoriaId: categoriaEdicao, pessoaId: pessoaEdicao === SEM_PESSOA ? null : pessoaEdicao });
    setEnviando(false);
    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }
    const categoria = categorias.find((c) => c.id === categoriaEdicao);
    const pessoa = pessoas.find((p) => p.id === pessoaEdicao);
    setRegras((atual) =>
      atual.map((r) => (r.id === regraId ? { ...r, categoriaId: categoriaEdicao, categoriaNome: categoria?.nome ?? r.categoriaNome, pessoaId: pessoa?.id ?? null, pessoaNome: pessoa?.nome ?? null } : r)),
    );
    setEditandoId(null);
  }

  async function apagar(regraId: string) {
    setEnviando(true);
    setErro("");
    const resultado = await apagarRegraAction(regraId);
    setEnviando(false);
    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }
    setRegras((atual) => atual.filter((r) => r.id !== regraId));
  }

  if (regras.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhuma regra ainda. Elas nascem sozinhas quando você categoriza um lançamento na tela de conciliação.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Descrição do banco</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Pessoa</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regras.map((regra) => {
              const emEdicao = editandoId === regra.id;
              return (
                <TableRow key={regra.id}>
                  <TableCell className="font-medium text-foreground">{regra.descricaoNormalizada}</TableCell>
                  <TableCell>
                    {emEdicao ? (
                      <Select value={categoriaEdicao} onValueChange={setCategoriaEdicao}>
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground">{regra.categoriaNome}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {emEdicao ? (
                      <Select value={pessoaEdicao} onValueChange={setPessoaEdicao}>
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SEM_PESSOA}>Nenhuma</SelectItem>
                          {pessoas.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground">{regra.pessoaNome ?? "-"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("border-none text-[10px] font-semibold", regra.origem === "HISTORICO" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
                      {regra.origem === "HISTORICO" ? "Histórico" : "Manual"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {emEdicao ? (
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={enviando} onClick={() => setEditandoId(null)}>
                          <X size={14} />
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" disabled={enviando} onClick={() => salvarEdicao(regra.id)}>
                          {enviando ? <Spinner size={13} className="animate-spin" /> : <Check size={14} />}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => iniciarEdicao(regra)}>
                          <PencilSimple size={14} />
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" disabled={enviando} onClick={() => apagar(regra.id)}>
                          <Trash size={14} />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
