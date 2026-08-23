"use client";

import { criarColunaLista, TabelaLista, BadgeStatusLista } from "@/components/tabela/tabela-lista";
import { formatarMoeda } from "@/lib/formatacao";
import { CancelarSerieButton } from "./cancelar-serie-button";

const ROTULO_UNIDADE: Record<string, string> = { DIA: "dia(s)", SEMANA: "semana(s)", MES: "mês(es)" };

export type LinhaRecorrencia = {
  id: string;
  descricao: string;
  valor_total: number;
  unidade_intervalo: string;
  intervalo: number;
  numero_ocorrencias: number | null;
  data_fim: string | null;
  ocorrencias_geradas: number;
  ativa: boolean;
};

const helper = criarColunaLista<LinhaRecorrencia>();

const colunas = helper.columns([
  helper.accessor("descricao", {
    id: "descricao",
    header: "Descrição",
    cell: (info) => <span className="font-semibold text-foreground">{info.getValue()}</span>,
  }),
  helper.accessor((r) => `A cada ${r.intervalo} ${ROTULO_UNIDADE[r.unidade_intervalo]}`, {
    id: "frequencia",
    header: "Frequência",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor(
    (r) =>
      r.numero_ocorrencias
        ? `Após ${r.numero_ocorrencias} ocorrências`
        : r.data_fim
          ? `Até ${new Date(r.data_fim + "T00:00:00").toLocaleDateString("pt-BR")}`
          : "Indefinido",
    {
      id: "termino",
      header: "Término",
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    },
  ),
  helper.accessor("valor_total", {
    id: "valor",
    header: "Valor",
    meta: { numerica: true },
    cell: (info) => <span className="tabular-nums text-foreground">{formatarMoeda(Number(info.getValue()))}</span>,
  }),
  helper.accessor("ocorrencias_geradas", {
    id: "geradas",
    header: "Geradas",
    meta: { numerica: true },
    cell: (info) => <span className="tabular-nums text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor("ativa", {
    id: "situacao",
    header: "Situação",
    cell: (info) => <BadgeStatusLista variante={info.getValue() ? "positivo" : "neutro"}>{info.getValue() ? "Ativa" : "Cancelada"}</BadgeStatusLista>,
  }),
]);

export function TabelaRecorrencias({ regras }: { regras: LinhaRecorrencia[] }) {
  return (
    <TabelaLista
      titulo="Séries"
      data={regras}
      columns={colunas}
      busca={false}
      textoVazio="Nenhuma série recorrente cadastrada ainda."
      acoes={(r) => (r.ativa ? <CancelarSerieButton regraId={r.id} /> : null)}
    />
  );
}
