"use client";

// Wrapper client component — mesmo motivo dos outros (dre/dfc-matriz-tabela,
// aging-participantes-tabela): página é Server Component, célula em JSX
// precisa ficar do lado do cliente. Sem ícone por linha — centro de custo
// não é uma entidade/categoria com identidade visual própria (ao contrário
// de receita/despesa de lançamento), então célula-líder é só o nome.
//
// Entradas/Saídas são links pros lançamentos que formam aquela soma —
// Saldo não (é uma subtração, não existe "os lançamentos do saldo") — por
// isso a linha inteira não vira `linkPara` como nas outras tabelas, cada
// valor tem seu próprio destino. `hoverLinha={false}` some com o realce de
// fundo da linha inteira (achado em revisão de código: sem isso, passar o
// mouse sobre "Centro de custo"/"Saldo" parecia convidar a clicar em
// qualquer lugar, mas só Entradas/Saídas navegam de verdade).
import Link from "next/link";
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
    cell: (info) => (
      <Link href={info.row.original.hrefEntradas} className="font-semibold tabular-nums text-positivo hover:underline">
        {formatarNumeroCompacto(info.getValue())}
      </Link>
    ),
  }),
  helper.accessor("saidas", {
    id: "saidas",
    header: "Saídas",
    meta: { numerica: true },
    cell: (info) => (
      <Link href={info.row.original.hrefSaidas} className="font-semibold tabular-nums text-destructive hover:underline">
        {formatarNumeroCompacto(info.getValue())}
      </Link>
    ),
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
      hoverLinha={false}
    />
  );
}
