"use client";

// Wrapper client component — mesmo motivo dos outros (dre/dfc-matriz-tabela,
// aging-participantes-tabela): página é Server Component, célula em JSX
// precisa ficar do lado do cliente. Sem ícone por linha — centro de custo
// não é uma entidade/categoria com identidade visual própria (ao contrário
// de receita/despesa de lançamento), então célula-líder é só o nome.
import type { LinhaCentroCusto } from "@/lib/relatorios/centro-custo";
import { formatarNumeroCompacto, formatarPercentual } from "@/lib/formatacao";
import { TabelaLista, criarColunaLista, ValorLista } from "@/components/tabela/tabela-lista";

const helper = criarColunaLista<LinhaCentroCusto>();

const colunas = helper.columns([
  helper.accessor("nome", {
    id: "nome",
    header: "Centro de custo",
    cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
  }),
  // Entradas/Saídas são categoria (dinheiro que entrou vs que saiu), não um
  // sinal a ler — cor fixa, não o ValorLista sign-based (que coloriria as
  // duas de verde, já que as duas chegam como número positivo).
  helper.accessor("entradas", {
    id: "entradas",
    header: "Entradas",
    meta: { numerica: true },
    cell: (info) => <span className="font-semibold tabular-nums text-positivo">{formatarNumeroCompacto(info.getValue())}</span>,
  }),
  helper.accessor("saidas", {
    id: "saidas",
    header: "Saídas",
    meta: { numerica: true },
    cell: (info) => <span className="font-semibold tabular-nums text-destructive">{formatarNumeroCompacto(info.getValue())}</span>,
  }),
  helper.accessor("saldo", {
    id: "saldo",
    header: "Saldo",
    meta: { numerica: true },
    cell: (info) => <ValorLista valor={info.getValue()} formatado={formatarNumeroCompacto(info.getValue())} />,
  }),
  helper.accessor("margemPercentual", {
    id: "margem",
    header: "Margem",
    meta: { numerica: true },
    cell: (info) => <span className="text-muted-foreground tabular-nums">{formatarPercentual(info.getValue())}</span>,
  }),
]);

export function CentroCustoTabela({ linhas }: { linhas: LinhaCentroCusto[] }) {
  return (
    <TabelaLista
      titulo="Resultado por centro de custo"
      data={linhas}
      columns={colunas}
      buscaPlaceholder="Buscar centro de custo…"
      textoVazio="Nenhum lançamento rateado por centro de custo no período selecionado."
    />
  );
}
