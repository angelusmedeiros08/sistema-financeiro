"use client";

import { criarColunaLista, TabelaLista, BadgeStatusLista } from "@/components/tabela/tabela-lista";
import { TagCategoria } from "@/components/ui/tag-categoria";
import { ToggleAtivoButton } from "./toggle-ativo-button";

export type LinhaCentroCusto = { id: string; codigo: string | null; nome: string; ativo: boolean };

const helper = criarColunaLista<LinhaCentroCusto>();

const colunas = helper.columns([
  helper.accessor("codigo", {
    id: "codigo",
    header: "Código",
    cell: (info) => <span className="text-muted-foreground">{info.getValue() ?? "-"}</span>,
  }),
  helper.accessor("nome", {
    id: "nome",
    header: "Nome",
    cell: (info) => <TagCategoria nome={info.getValue()} />,
  }),
  helper.accessor("ativo", {
    id: "situacao",
    header: "Situação",
    cell: (info) => <BadgeStatusLista variante={info.getValue() ? "positivo" : "neutro"}>{info.getValue() ? "Ativo" : "Inativo"}</BadgeStatusLista>,
  }),
]);

export function TabelaCentrosCusto({ centros }: { centros: LinhaCentroCusto[] }) {
  return (
    <TabelaLista
      titulo="Centros de custo"
      data={centros}
      columns={colunas}
      busca={false}
      textoVazio="Nenhum centro de custo cadastrado ainda."
      acoes={(c) => <ToggleAtivoButton id={c.id} ativo={c.ativo} />}
    />
  );
}
