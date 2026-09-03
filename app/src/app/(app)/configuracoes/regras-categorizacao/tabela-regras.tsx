"use client";

import { useMemo, useState } from "react";
import { Check, PencilSimple, Spinner, Trash, X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabelaLista, criarColunaLista } from "@/components/tabela/tabela-lista";
import { DotsThree } from "@phosphor-icons/react/dist/ssr";
import type { RegraCategorizacao } from "@/lib/conciliacao/regras";
import { editarRegraAction, apagarRegraAction } from "./actions";
import { cn } from "@/lib/utils";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

const SEM_PESSOA = "__sem_pessoa__";

// Coluna de ação é montada à mão (não via `acoes` da TabelaLista) porque a
// linha em edição troca o menu `⋯` por botões Salvar/Cancelar visíveis
// direto — esconder isso atrás de um menu tornaria o fluxo de edição menos
// descobrível bem no momento em que o usuário mais precisa deles.
const helper = criarColunaLista<RegraCategorizacao>();

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

  function iniciarEdicao(regra: RegraCategorizacao) {
    setEditandoId(regra.id);
    setCategoriaEdicao(regra.categoriaId);
    setPessoaEdicao(regra.pessoaId ?? SEM_PESSOA);
  }

  async function salvarEdicao(regraId: string) {
    setEnviando(true);
    const resultado = await editarRegraAction(regraId, { categoriaId: categoriaEdicao, pessoaId: pessoaEdicao === SEM_PESSOA ? null : pessoaEdicao });
    setEnviando(false);
    notificarResultado(resultado.erro ? { erro: resultado.erro } : { sucesso: true }, "Regra salva.");
    if (resultado.erro) {
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
    const resultado = await apagarRegraAction(regraId);
    setEnviando(false);
    notificarResultado(resultado.erro ? { erro: resultado.erro } : { sucesso: true }, "Regra removida.");
    if (resultado.erro) {
      return;
    }
    setRegras((atual) => atual.filter((r) => r.id !== regraId));
  }

  const colunas = useMemo(
    () =>
      helper.columns([
        helper.accessor("descricaoNormalizada", {
          id: "descricao",
          header: "Descrição do banco",
          cell: (info) => <span className="font-semibold text-foreground">{info.getValue()}</span>,
        }),
        helper.display({
          id: "categoria",
          header: "Categoria",
          cell: ({ row }) => {
            const regra = row.original;
            if (editandoId !== regra.id) return <span className="text-muted-foreground">{regra.categoriaNome}</span>;
            return (
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
            );
          },
        }),
        helper.display({
          id: "pessoa",
          header: "Pessoa",
          cell: ({ row }) => {
            const regra = row.original;
            if (editandoId !== regra.id) return <span className="text-muted-foreground">{regra.pessoaNome ?? "-"}</span>;
            return (
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
            );
          },
        }),
        helper.accessor("origem", {
          id: "origem",
          header: "Origem",
          cell: (info) => (
            <Badge variant="outline" className={cn("border-none text-[10px] font-semibold", info.getValue() === "HISTORICO" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
              {info.getValue() === "HISTORICO" ? "Histórico" : "Manual"}
            </Badge>
          ),
        }),
        helper.display({
          id: "_acoes",
          header: "",
          cell: ({ row }) => {
            const regra = row.original;
            if (editandoId === regra.id) {
              return (
                <div className="flex justify-end gap-1">
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
                    onClick={() => salvarEdicao(regra.id)}
                    aria-label="Salvar edição"
                  >
                    {enviando ? <Spinner size={13} className="animate-spin" /> : <Check size={14} />}
                  </Button>
                </div>
              );
            }
            return (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex size-7 items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Mais ações"
                    >
                      <DotsThree size={18} weight="bold" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => iniciarEdicao(regra)}>
                      <PencilSimple size={14} />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" disabled={enviando} onSelect={() => apagar(regra.id)}>
                      <Trash size={14} />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          },
        }),
      ]),
    [editandoId, categoriaEdicao, pessoaEdicao, enviando, categorias, pessoas],
  );

  if (regras.length === 0) {
    return <EstadoVazio texto="Nenhuma regra ainda. Elas nascem sozinhas quando você categoriza um lançamento na tela de conciliação." />;
  }

  return (
    <div className="flex flex-col gap-2">
      <TabelaLista titulo="Regras de categorização" data={regras} columns={colunas} busca={false} textoVazio="Nenhuma regra ainda." />
    </div>
  );
}
