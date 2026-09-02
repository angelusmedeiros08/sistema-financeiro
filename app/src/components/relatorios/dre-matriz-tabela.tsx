"use client";

// Wrapper client component: a página da DRE é um Server Component (busca
// dado via Supabase direto no servidor) e TabelaMatriz precisa rodar no
// cliente (sort, hover). Definição de coluna usa função de célula (JSX),
// que não pode atravessar a fronteira servidor→cliente como prop de um
// Server Component — então a montagem das colunas mora aqui dentro, e a
// página só passa o array de linhas já filtrado (serializável).
//
// Formato "planilha, como antes": sem coluna "#" (não existia na <table>
// crua original, só "Linha"), sem super-header de ano acima dos meses
// (a DRE nunca teve 2 linhas de cabeçalho — isso é coisa da DFC, que tem
// mesmo motivo estrutural real: 3 sub-colunas por mês). Achado do usuário
// vendo o sistema de verdade, não fazia parte do arquétipo original.
import { useMemo } from "react";
import Link from "next/link";
import { formatarNumeroCompacto } from "@/lib/formatacao";
import type { LinhaDreMatriz } from "@/lib/relatorios/dre";
import { TabelaMatriz, criarColunaMatriz, ValorMatriz, CelulaAV, type TipoLinhaMatriz } from "@/components/tabela/tabela-matriz";

// Célula com link só quando a linha é FOLHA (`href` presente) — subtotal/
// final não têm um conjunto de categorias único por trás (ver comentário em
// lib/relatorios/dre.ts, LinhaDreMatriz.href*). Link por célula, não linha
// inteira (cada mês tem seu próprio período) — mesmo padrão de
// centro-custo-tabela.tsx.
function CelulaValor({ valor, href }: { valor: number; href: string | null }) {
  const conteudo = <ValorMatriz valor={valor} formatado={formatarNumeroCompacto(valor)} />;
  if (!href) return conteudo;
  return (
    <Link href={href} className="block hover:underline">
      {conteudo}
    </Link>
  );
}

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const IDS_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type LinhaMatrizDre = LinhaDreMatriz & { tipoLinha: TipoLinhaMatriz };

// SUBTOTAL_ALTERNATIVO ("Lucro Bruto") e RESULTADO_NAO_OPERACIONAL viram
// "subtotal" igual aos demais totalizadores — o arquétipo aprovado só tem 3
// tipos (detalhe/subtotal/final), então o tom sage/dourado que essas duas
// linhas tinham na versão anterior (raw <table>) se perde aqui. Simplificação
// deliberada; fica registrada pra entrar na revisão de melhorias.
function paraLinhasMatriz(linhas: LinhaDreMatriz[]): LinhaMatrizDre[] {
  const idxUltimoTotal = linhas.map((l) => l.tipoCalc !== "FOLHA").lastIndexOf(true);
  return linhas.map((linha, i) => ({
    ...linha,
    tipoLinha: linha.tipoCalc === "FOLHA" ? "detalhe" : i === idxUltimoTotal ? "final" : "subtotal",
  }));
}

const helper = criarColunaMatriz<LinhaMatrizDre>();

const colunasMensais = helper.columns(
  IDS_MES.map((id, i) =>
    helper.accessor((linha) => linha.meses[i], {
      id,
      header: NOMES_MES[i],
      meta: { numerica: true },
      enableSorting: false,
      cell: (info) => <CelulaValor valor={info.getValue()} href={info.row.original.hrefsPorMes[i]} />,
    }),
  ),
);

export function DreMatrizTabela({ linhas, ano }: { linhas: LinhaDreMatriz[]; ano: number }) {
  const dados = useMemo(() => paraLinhasMatriz(linhas), [linhas]);

  const colunas = useMemo(
    () =>
      helper.columns([
        // Sem ordenação em nenhuma coluna de propósito: a ordem da linha
        // NÃO é um dado arbitrário aqui, é a própria estrutura contábil da
        // DRE (receita → custos → subtotal → EBITDA → resultado final).
        // Ordenar por "Linha" (alfabético) ou por um mês quebra a leitura
        // do demonstrativo — achado real do usuário vendo o sistema, não é
        // regressão do arquétipo em si (a matriz de Previsionamento já tinha essa
        // mesma decisão, mas por outro motivo).
        helper.accessor("rotulo", { id: "linha", header: "Linha", size: 190, enableSorting: false }),
        ...colunasMensais,
        helper.accessor("total", {
          id: "total",
          header: "Total",
          meta: { numerica: true, totalizador: true },
          enableSorting: false,
          cell: (info) => <CelulaValor valor={info.getValue()} href={info.row.original.hrefTotal} />,
        }),
        helper.accessor("avPercentual", {
          id: "av",
          header: "AV%",
          meta: { numerica: true },
          enableSorting: false,
          cell: (info) => <CelulaAV percentual={info.getValue()} negativo={info.getValue() < 0} />,
        }),
      ]),
    [],
  );

  const anoAtual = new Date().getFullYear();
  const idMesAtual = ano === anoAtual ? IDS_MES[new Date().getMonth()] : undefined;

  return (
    <TabelaMatriz
      titulo={`DRE: Demonstrativo de Resultado (${ano})`}
      data={dados}
      columns={colunas}
      idsColunasFixas={["linha"]}
      ehColunaMesAtual={idMesAtual ? (id) => id === idMesAtual : undefined}
      obterTipoLinha={(linha) => linha.tipoLinha}
    />
  );
}
