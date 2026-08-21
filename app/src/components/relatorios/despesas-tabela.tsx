"use client";

// Wrapper client component — mesmo motivo dos outros. Célula-líder usa a
// mesma convenção que o resto do app já usa pra categoria — bolinha colorida
// por nome (corPorNome/PontoCategoria, ver components/ui/tag-categoria.tsx),
// não um glifo de ícone: categoria é nome livre definido pelo tenant, não dá
// pra mapear um ícone de verdade sem chutar. "Tipo" (Fixo/Variável) é
// classificação, não status — Badge simples, sem bolinha de status
// (BadgeStatusLista é pra outra coisa).
import { Badge } from "@/components/ui/badge";
import { PontoCategoria } from "@/components/ui/tag-categoria";
import { TrilhoBarra } from "@/components/relatorios/trilho-barra";
import type { LinhaAnaliseCategoria } from "@/lib/relatorios/analise-despesas";
import { formatarMoeda, formatarNumeroCompacto, formatarPercentual } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { TabelaLista, criarColunaLista } from "@/components/tabela/tabela-lista";

const helper = criarColunaLista<LinhaAnaliseCategoria>();

function criarColunas(maior: number) {
  return helper.columns([
    helper.accessor("categoriaNome", {
      id: "categoria",
      header: "Categoria",
      cell: (info) => {
        const linha = info.row.original;
        return (
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <PontoCategoria nome={linha.categoriaNome} />
              {linha.categoriaNome}
            </span>
            <div className="w-full max-w-40">
              <TrilhoBarra valorPercentual={linha.total / maior} cor="#B23A2E" espessura={5} valorFormatado={formatarMoeda(linha.total)} />
            </div>
          </div>
        );
      },
    }),
    helper.accessor("ehCustoFixo", {
      id: "tipo",
      header: "Tipo",
      cell: (info) => (
        <Badge className={cn("border-none font-semibold", info.getValue() ? "bg-[#7A8B5C]/12 text-[#4F5C3A]" : "bg-muted text-muted-foreground")}>
          {info.getValue() ? "Fixo" : "Variável"}
        </Badge>
      ),
    }),
    helper.accessor("total", {
      id: "total",
      header: "Total",
      meta: { numerica: true },
      cell: (info) => <span className="font-semibold tabular-nums text-foreground">{formatarNumeroCompacto(info.getValue())}</span>,
    }),
    helper.accessor("percentualDoTotal", {
      id: "percentualDoTotal",
      header: "% do total",
      meta: { numerica: true },
      cell: (info) => <span className="text-muted-foreground tabular-nums">{formatarPercentual(info.getValue())}</span>,
    }),
    helper.accessor("percentualAcumulado", {
      id: "percentualAcumulado",
      header: "% acumulado",
      meta: { numerica: true },
      cell: (info) => (
        <span className={cn("tabular-nums", info.getValue() <= 0.8 ? "font-semibold text-[#C98A1F]" : "text-muted-foreground")}>
          {formatarPercentual(info.getValue())}
        </span>
      ),
    }),
  ]);
}

export function DespesasTabela({ linhas }: { linhas: LinhaAnaliseCategoria[] }) {
  const maior = Math.max(...linhas.map((l) => l.total), 1);
  return (
    <TabelaLista
      titulo="Análise de despesas (curva ABC)"
      data={linhas}
      columns={criarColunas(maior)}
      buscaPlaceholder="Buscar categoria…"
      textoVazio="Nenhuma despesa categorizada no período selecionado."
    />
  );
}
