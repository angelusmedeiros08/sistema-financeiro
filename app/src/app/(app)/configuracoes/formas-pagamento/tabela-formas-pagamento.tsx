"use client";

import { criarColunaLista, TabelaLista, BadgeStatusLista } from "@/components/tabela/tabela-lista";
import { ToggleAtivoButton } from "./toggle-ativo-button";

export type LinhaFormaPagamento = { id: string; nome: string; ativo: boolean };

const helper = criarColunaLista<LinhaFormaPagamento>();

const colunas = helper.columns([
  helper.accessor("nome", {
    id: "nome",
    header: "Nome",
    cell: (info) => <span className="font-semibold text-foreground">{info.getValue()}</span>,
  }),
  helper.accessor("ativo", {
    id: "situacao",
    header: "Situação",
    cell: (info) => <BadgeStatusLista variante={info.getValue() ? "positivo" : "neutro"}>{info.getValue() ? "Ativo" : "Inativo"}</BadgeStatusLista>,
  }),
]);

export function TabelaFormasPagamento({ formas }: { formas: LinhaFormaPagamento[] }) {
  return (
    <TabelaLista
      titulo="Formas de pagamento"
      data={formas}
      columns={colunas}
      busca={false}
      textoVazio="Nenhuma forma de pagamento cadastrada ainda."
      acoes={(f) => <ToggleAtivoButton id={f.id} ativo={f.ativo} />}
    />
  );
}
