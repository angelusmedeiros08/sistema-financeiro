"use client";

import { criarColunaLista, TabelaLista } from "@/components/tabela/tabela-lista";

export type LinhaErroImportacao = { id: string; linhaNumero: number; nome: string; erro: string | null };

const helper = criarColunaLista<LinhaErroImportacao>();

const colunas = helper.columns([
  helper.accessor("linhaNumero", {
    id: "linha",
    header: "Linha",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor("nome", {
    id: "nome",
    header: "Nome",
    cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
  }),
  helper.accessor("erro", {
    id: "erro",
    header: "Erro",
    cell: (info) => <span className="text-destructive">{info.getValue()}</span>,
  }),
]);

export function TabelaErrosImportacao({ itens }: { itens: LinhaErroImportacao[] }) {
  return <TabelaLista titulo="Linhas com erro" data={itens} columns={colunas} busca={false} textoVazio="Nenhuma linha com erro." />;
}
