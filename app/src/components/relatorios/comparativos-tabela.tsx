"use client";

// Wrapper client component — mesmo motivo dos outros. Linha aqui é período
// (mês), não entidade — sem ícone, sem badge, só texto + cor por sinal na
// Variação (quando existe: YTD não tem coluna de variação, a página já
// decide isso e passa a coluna pronta ou não pra este componente).
import { useMemo } from "react";
import type { PontoAnaliseComparativa } from "@/lib/relatorios/analises-comparativas";
import { formatarNumeroCompacto, formatarPercentual } from "@/lib/formatacao";
import { TabelaLista, criarColunaLista, ValorLista } from "@/components/tabela/tabela-lista";
import { DicaContextual } from "@/components/formularios/dica-contextual";

const helper = criarColunaLista<PontoAnaliseComparativa>();

export function ComparativosTabela({
  titulo,
  pontos,
  colunaComparacao,
  mostrarVariacao,
  hrefsPorPonto,
}: {
  titulo: string;
  pontos: PontoAnaliseComparativa[];
  colunaComparacao: string;
  mostrarVariacao: boolean;
  // Mesmo array (por índice) que ComparativoLinhaAnotada já recebe — o
  // gráfico acima já é clicável com esses hrefs, a tabela só reaproveita.
  hrefsPorPonto?: string[];
}) {
  const colunas = useMemo(() => {
    const base = [
      helper.accessor("chave", {
        id: "periodo",
        header: "Período",
        cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
      }),
      helper.accessor("atual", {
        id: "atual",
        header: "Resultado",
        meta: { numerica: true },
        cell: (info) => <span className="tabular-nums">{formatarNumeroCompacto(info.getValue())}</span>,
      }),
      helper.accessor("comparacao", {
        id: "comparacao",
        header: colunaComparacao,
        meta: { numerica: true },
        cell: (info) => <span className="text-muted-foreground tabular-nums">{formatarNumeroCompacto(info.getValue())}</span>,
      }),
    ];
    if (!mostrarVariacao) return helper.columns(base);
    return helper.columns([
      ...base,
      helper.accessor("variacaoPercentual", {
        id: "variacao",
        header: "Variação",
        meta: { numerica: true },
        cell: (info) => {
          const valor = info.getValue();
          if (valor === null) {
            return (
              <span className="flex items-center justify-end gap-1">
                <ValorLista valor={null} formatado="" />
                <DicaContextual titulo="Sem dado para comparar" texto="Não há movimento registrado no período de comparação." />
              </span>
            );
          }
          return <ValorLista valor={valor} formatado={formatarPercentual(valor)} />;
        },
      }),
    ]);
  }, [colunaComparacao, mostrarVariacao]);

  return (
    <TabelaLista
      titulo={titulo}
      data={pontos}
      columns={colunas}
      buscaPlaceholder="Buscar período…"
      textoVazio="Sem movimentação suficiente no período para comparar."
      linkPara={hrefsPorPonto ? (linha) => hrefsPorPonto[pontos.indexOf(linha)] : undefined}
    />
  );
}
