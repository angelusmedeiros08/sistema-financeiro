"use client";

import { Badge } from "@/components/ui/badge";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { TagCategoria } from "@/components/ui/tag-categoria";
import { TabelaLista, criarColunaLista } from "@/components/tabela/tabela-lista";
import { formatarMoeda } from "@/lib/formatacao";
import { ROTULO_STATUS_PARCELA, COR_STATUS_PARCELA } from "@/lib/status-parcela";
import { cn } from "@/lib/utils";

type EventoLinha = {
  id: string;
  descricao: string | null;
  valor_total: number;
  parcelas: { status: string; data_vencimento: string }[] | null;
  rateio_categoria: { categorias_financeiras: { nome: string } | null }[] | null;
  // Os 2 campos abaixo só vêm preenchidos na tela de Lançamentos filtrados
  // (mistura receita/despesa, e o evento pode estar dividido entre mais de
  // uma categoria/forma de pagamento) — Despesas/Receitas nunca os passam.
  tipo?: "RECEITA" | "DESPESA";
  // Fração do evento que corresponde ao filtro ativo — mostrada no lugar de
  // valor_total quando presente, pra linha não exibir o valor cheio de um
  // evento que só está aqui parcialmente (ex.: metade pago em Pix).
  valorFiltrado?: number;
};

const helper = criarColunaLista<EventoLinha>();

const colunas = helper.columns([
  helper.accessor((e) => e.descricao ?? "Sem descrição", {
    id: "descricao",
    header: "Descrição",
    cell: (info) => <span className="font-semibold text-foreground">{info.getValue()}</span>,
  }),
  helper.display({
    id: "categoria",
    header: "Categoria",
    cell: ({ row }) => {
      const linhasRateio = row.original.rateio_categoria ?? [];
      const categoriaNome = linhasRateio[0]?.categorias_financeiras?.nome;
      const outrasCategorias = linhasRateio.length - 1;
      if (!categoriaNome) return <span className="text-muted-foreground">-</span>;
      return (
        <span className="inline-flex items-center gap-1">
          <TagCategoria nome={categoriaNome} />
          {outrasCategorias > 0 && <span className="text-xs text-muted-foreground">+{outrasCategorias}</span>}
        </span>
      );
    },
  }),
  helper.display({
    id: "vencimento",
    header: "Vencimento",
    cell: ({ row }) => {
      const parcelas = row.original.parcelas ?? [];
      const primeiraParcela = parcelas[0];
      return (
        <span className="text-muted-foreground">
          {primeiraParcela ? new Date(primeiraParcela.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "-"}
          {parcelas.length > 1 && <span className="ml-1 text-xs">({parcelas.length}x)</span>}
        </span>
      );
    },
  }),
  helper.display({
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const primeiraParcela = (row.original.parcelas ?? [])[0];
      if (!primeiraParcela) return <span className="text-muted-foreground">-</span>;
      return (
        <Badge className={cn("border-none font-semibold", COR_STATUS_PARCELA[primeiraParcela.status])}>
          {ROTULO_STATUS_PARCELA[primeiraParcela.status] ?? primeiraParcela.status}
        </Badge>
      );
    },
  }),
  helper.accessor((e) => e.valorFiltrado ?? e.valor_total, {
    id: "valor",
    header: "Valor",
    meta: { numerica: true },
    cell: (info) => <span className="font-semibold tabular-nums text-foreground">{formatarMoeda(info.getValue())}</span>,
  }),
]);

export function TabelaEventos({
  eventos,
  textoVazio,
  titulo = "Lançamentos",
  caminhoBase,
  paginacao,
}: {
  eventos: EventoLinha[];
  textoVazio: string;
  titulo?: string;
  // string, não função — funções não atravessam a fronteira Server/Client
  // Component (esta tabela é "use client", as páginas que a chamam não são).
  caminhoBase?: "receitas" | "despesas";
  /**
   * Paginação real no servidor — `eventos` já é só a página atual. `hrefBase`
   * é o caminho completo da tela (com outros filtros já aplicados, ex.
   * "/lancamentos?periodo_inicio=..."), não é derivado de `caminhoBase`
   * porque /lancamentos mistura receita/despesa e não tem um `caminhoBase`
   * único. Ver `paginacaoServidor` em TabelaLista.
   */
  paginacao?: { pagina: number; totalPaginas: number; totalRegistros: number; tamanhoPagina: number; hrefBase: string };
}) {
  if (eventos.length === 0 && !paginacao) {
    return <EstadoVazio texto={textoVazio} />;
  }

  const linkPara = caminhoBase
    ? (e: EventoLinha) => `/${caminhoBase}/${e.id}`
    : eventos[0]?.tipo
      ? (e: EventoLinha) => `/${e.tipo === "RECEITA" ? "receitas" : "despesas"}/${e.id}`
      : undefined;

  return (
    <TabelaLista
      titulo={titulo}
      data={eventos}
      columns={colunas}
      busca={false}
      textoVazio={textoVazio}
      linkPara={linkPara}
      paginacaoServidor={paginacao}
    />
  );
}
