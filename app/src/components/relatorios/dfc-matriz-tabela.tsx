"use client";

// Wrapper client component — mesmo motivo do dre-matriz-tabela.tsx (a
// página é Server Component, a montagem de coluna com célula em JSX
// precisa ficar do lado do cliente). A matriz da DFC não é hierárquica
// como a DRE: 4 linhas fixas (3 atividades + geração de caixa) e, por mês,
// 3 sub-colunas (Previsto/Realizado/Variação) em vez de 1 — por isso o
// cabeçalho usa um grupo por mês (12 grupos de 3 folhas), não um grupo só
// cobrindo os 12 meses como na DRE.
import { useMemo } from "react";
import { formatarNumeroCompacto } from "@/lib/formatacao";
import type { LinhaDfcMatriz } from "@/lib/relatorios/dfc";
import { TabelaMatriz, criarColunaMatriz, ValorMatriz, type TipoLinhaMatriz } from "@/components/tabela/tabela-matriz";

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const IDS_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type LinhaMatrizDfc = LinhaDfcMatriz & { numero: number; tipoLinha: TipoLinhaMatriz | undefined };

function paraLinhasMatriz(linhas: LinhaDfcMatriz[]): LinhaMatrizDfc[] {
  return linhas.map((linha, i) => ({
    ...linha,
    numero: i + 1,
    // Geração de caixa é a soma das 3 atividades acima — mesmo papel de
    // "linha final" que o arquétipo já trata (friso terracota + negrito
    // mais pesado). As 3 atividades em si não são "detalhe" de nada acima
    // delas (a DFC não é hierárquica como a DRE) — ficam sem estilo
    // especial, tipoLinha undefined.
    tipoLinha: linha.atividade === "GERACAO_CAIXA" ? "final" : undefined,
  }));
}

const helper = criarColunaMatriz<LinhaMatrizDfc>();

function celulaPrevisto(valor: number) {
  return <span className="text-muted-foreground">{formatarNumeroCompacto(valor)}</span>;
}

function colunasDoMes(idMes: string, nomeMes: string, indiceMes: number) {
  return helper.group({
    id: `grupo_${idMes}`,
    header: nomeMes,
    columns: helper.columns([
      helper.accessor((linha) => linha.mesesPrevisto[indiceMes], {
        id: `${idMes}_previsto`,
        header: "Prev.",
        meta: { numerica: true },
        enableSorting: false,
        cell: (info) => celulaPrevisto(info.getValue()),
      }),
      helper.accessor((linha) => linha.mesesRealizado[indiceMes], {
        id: `${idMes}_realizado`,
        header: "Real.",
        meta: { numerica: true },
        enableSorting: false,
        cell: (info) => formatarNumeroCompacto(info.getValue()),
      }),
      helper.accessor((linha) => linha.mesesRealizado[indiceMes] - linha.mesesPrevisto[indiceMes], {
        id: `${idMes}_variacao`,
        header: "Var.",
        meta: { numerica: true },
        enableSorting: false,
        cell: (info) => <ValorMatriz valor={info.getValue()} formatado={formatarNumeroCompacto(info.getValue())} />,
      }),
    ]),
  });
}

const colunasMensais = IDS_MES.map((id, i) => colunasDoMes(id, NOMES_MES[i], i));

export function DfcMatrizTabela({ linhas, ano }: { linhas: LinhaDfcMatriz[]; ano: number }) {
  const dados = useMemo(() => paraLinhasMatriz(linhas), [linhas]);

  const colunas = useMemo(
    () =>
      // Sem ordenação de propósito (mesmo motivo da DRE): a ordem de linha
      // é a estrutura da DFC (atividades → geração de caixa), não dado
      // arbitrário — ordenar quebra a leitura do demonstrativo.
      helper.columns([
        helper.accessor("numero", { id: "numero", header: "#", size: 34, enableSorting: false }),
        helper.accessor("rotulo", { id: "linha", header: "Atividade", size: 210, enableSorting: false }),
        ...colunasMensais,
        helper.group({
          id: "grupo_total",
          header: "Total",
          columns: helper.columns([
            helper.accessor("totalPrevisto", {
              id: "total_previsto",
              header: "Prev.",
              meta: { numerica: true, totalizador: true },
              enableSorting: false,
              cell: (info) => celulaPrevisto(info.getValue()),
            }),
            helper.accessor("totalRealizado", {
              id: "total_realizado",
              header: "Real.",
              meta: { numerica: true, totalizador: true },
              enableSorting: false,
              cell: (info) => formatarNumeroCompacto(info.getValue()),
            }),
            helper.accessor((linha) => linha.totalRealizado - linha.totalPrevisto, {
              id: "total_variacao",
              header: "Var.",
              meta: { numerica: true, totalizador: true },
              enableSorting: false,
              cell: (info) => <ValorMatriz valor={info.getValue()} formatado={formatarNumeroCompacto(info.getValue())} />,
            }),
          ]),
        }),
      ]),
    [],
  );

  const anoAtual = new Date().getFullYear();
  const idMesAtual = ano === anoAtual ? IDS_MES[new Date().getMonth()] : undefined;

  return (
    <TabelaMatriz
      titulo={`DFC: Fluxo de Caixa por atividade (${ano})`}
      data={dados}
      columns={colunas}
      idsColunasFixas={["numero", "linha"]}
      ehColunaMesAtual={idMesAtual ? (id) => id.startsWith(`${idMesAtual}_`) : undefined}
      obterTipoLinha={(linha) => linha.tipoLinha}
    />
  );
}
