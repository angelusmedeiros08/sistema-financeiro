"use client";

import { criarColunaLista, TabelaLista } from "@/components/tabela/tabela-lista";
import { BadgeStatusImportacao } from "./badge-status";

export type LinhaImportacao = {
  id: string;
  nomeArquivo: string;
  tipo: string;
  criadoPorNome: string | null;
  criadoEm: string;
  sucessos: number;
  erros: number;
  pendentes: number;
  status: string;
};

const ROTULO_TIPO: Record<string, string> = {
  pessoas: "Clientes/Fornecedores",
};

const helper = criarColunaLista<LinhaImportacao>();

const colunas = helper.columns([
  helper.accessor("nomeArquivo", {
    id: "arquivo",
    header: "Arquivo",
    cell: (info) => <span className="font-semibold text-foreground">{info.getValue()}</span>,
  }),
  helper.accessor((i) => ROTULO_TIPO[i.tipo] ?? i.tipo, {
    id: "tipo",
    header: "Tipo",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor((i) => i.criadoPorNome ?? "-", {
    id: "importadoPor",
    header: "Importado por",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor((i) => new Date(i.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }), {
    id: "data",
    header: "Data",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.display({
    id: "resultado",
    header: "Resultado",
    cell: ({ row }) => {
      const i = row.original;
      return (
        <span className="text-muted-foreground">
          <span className="text-positivo-foreground">{i.sucessos} ok</span>
          {i.erros > 0 && <span className="text-destructive"> · {i.erros} erro{i.erros > 1 ? "s" : ""}</span>}
          {i.pendentes > 0 && <span> · {i.pendentes} pendente{i.pendentes > 1 ? "s" : ""}</span>}
        </span>
      );
    },
  }),
  helper.accessor("status", {
    id: "status",
    header: "Status",
    cell: (info) => <BadgeStatusImportacao status={info.getValue()} />,
  }),
]);

export function TabelaHistoricoImportacoes({ importacoes }: { importacoes: LinhaImportacao[] }) {
  return (
    <TabelaLista
      titulo="Importações"
      data={importacoes}
      columns={colunas}
      busca={false}
      textoVazio="Nenhuma importação registrada ainda."
      linkPara={(i) => `/importacao/historico/${i.id}`}
    />
  );
}
