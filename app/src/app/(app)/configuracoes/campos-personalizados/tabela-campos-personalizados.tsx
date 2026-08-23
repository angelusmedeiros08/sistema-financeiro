"use client";

import { criarColunaLista, TabelaLista, BadgeStatusLista } from "@/components/tabela/tabela-lista";
import { RemoverCampoButton } from "./remover-campo-button";

export type LinhaCampoPersonalizado = { id: string; rotulo: string; tipo: string; aplica_a: string; disponivel: boolean };

const ROTULO_TIPO: Record<string, string> = {
  TEXTO: "Texto",
  NUMERO: "Número",
  DATA: "Data",
  BOOLEANO: "Sim/Não",
};

const ROTULO_APLICA_A: Record<string, string> = {
  AMBOS: "Clientes e fornecedores",
  CLIENTE: "Só clientes",
  FORNECEDOR: "Só fornecedores",
};

const helper = criarColunaLista<LinhaCampoPersonalizado>();

const colunas = helper.columns([
  helper.accessor("rotulo", {
    id: "rotulo",
    header: "Rótulo",
    cell: (info) => <span className="font-semibold text-foreground">{info.getValue()}</span>,
  }),
  helper.accessor((c) => ROTULO_TIPO[c.tipo] ?? c.tipo, {
    id: "tipo",
    header: "Tipo",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor((c) => ROTULO_APLICA_A[c.aplica_a] ?? c.aplica_a, {
    id: "aplicaA",
    header: "Aplica a",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor("disponivel", {
    id: "situacao",
    header: "Situação",
    cell: (info) => <BadgeStatusLista variante={info.getValue() ? "positivo" : "neutro"}>{info.getValue() ? "Ativo" : "Removido"}</BadgeStatusLista>,
  }),
]);

export function TabelaCamposPersonalizados({ campos }: { campos: LinhaCampoPersonalizado[] }) {
  return (
    <TabelaLista
      titulo="Campos personalizados"
      data={campos}
      columns={colunas}
      busca={false}
      textoVazio="Nenhum campo personalizado cadastrado ainda."
      acoes={(c) => (c.disponivel ? <RemoverCampoButton campoId={c.id} /> : null)}
    />
  );
}
