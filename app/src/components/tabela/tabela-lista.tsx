"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  createTableHook,
  flexRender,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  type CellData,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type SortingState,
  type TableFeatures,
} from "@tanstack/react-table";
import { CaretLeft, CaretRight, DotsThree, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { hrefComPagina } from "./href-pagina";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Arquétipo 2 (lista/registro) — motor headless TanStack Table v9 por
// baixo (API de registro explícito de feature, ver
// node_modules/@tanstack/react-table/skills/), estilo 100% Tailwind
// próprio (não é um pacote de tabela pronto). Cobre
// Aging/CentroCusto/Despesas/Comparativos/FluxoCaixa e, depois, as tabelas
// shadcn <Table> já existentes do sistema. A página só declara `columns`
// (via `criarColunaLista`, já tipado pras features certas) e passa `data`
// — nenhuma regra de negócio mora aqui.
//
// Cor é sempre estado de UI (terracota: hover, ordenação ativa) OU
// semântica financeira (verde --positivo / vermelho --destructive), nunca
// as duas coisas ao mesmo tempo — mesma regra fixada na spec depois da
// correção de token da Fatia 2.

const featuresLista = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

const { createAppColumnHelper, useAppTable } = createTableHook({ features: featuresLista });

/** Helper tipado pra declarar colunas — `criarColunaLista<MinhaLinha>().accessor(...)`. */
export const criarColunaLista = createAppColumnHelper;

export type ColunaLista<TData extends Record<string, any>> = ColumnDef<typeof featuresLista, TData, any>;

declare module "@tanstack/react-table" {
  interface ColumnMeta<TFeatures extends TableFeatures, TData extends RowData, TValue extends CellData = CellData> {
    numerica?: boolean;
  }
}

type VarianteBadge = "positivo" | "pendente" | "negativo" | "neutro";

const TONS_BADGE: Record<VarianteBadge, string> = {
  positivo: "bg-positivo/12 text-positivo-foreground",
  pendente: "bg-[#C98A1F]/12 text-[#96690F]",
  negativo: "bg-destructive/12 text-destructive-foreground",
  neutro: "bg-muted text-muted-foreground",
};

const PONTOS_BADGE: Record<VarianteBadge, string> = {
  positivo: "bg-positivo",
  pendente: "bg-[#C98A1F]",
  negativo: "bg-destructive",
  neutro: "bg-muted-foreground",
};

/** Badge de status com bolinha colorida — pra coluna "Status" da lista. */
export function BadgeStatusLista({ variante, children }: { variante: VarianteBadge; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold", TONS_BADGE[variante])}>
      <span className={cn("size-1.5 shrink-0 rounded-full", PONTOS_BADGE[variante])} />
      {children}
    </span>
  );
}

type IconeLista = ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill"; className?: string }>;

/** Célula-líder: ícone colorido + texto de 2 linhas (primária em negrito, secundária muted). */
export function CelulaLideranca({ icone: Icone, cor, primario, secundario }: { icone: IconeLista; cor: string; primario: string; secundario?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-[11px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.06)]"
        style={{ background: cor }}
      >
        <Icone size={17} weight="bold" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-foreground">{primario}</div>
        {secundario && <div className="truncate text-[11.5px] text-muted-foreground">{secundario}</div>}
      </div>
    </div>
  );
}

/** Valor tabular-nums colorido por sinal — recebe o texto já formatado (moeda/percentual). */
export function ValorLista({ valor, formatado }: { valor: number; formatado: string }) {
  return (
    <span className={cn("font-bold tabular-nums", valor > 0 ? "text-positivo" : valor < 0 ? "text-destructive" : "text-foreground")}>{formatado}</span>
  );
}

function paginasVisiveis(atual: number, total: number, maximo = 5): number[] {
  if (total <= maximo) return Array.from({ length: total }, (_, i) => i);
  const metade = Math.floor(maximo / 2);
  let inicio = Math.max(0, atual - metade);
  const fim = Math.min(total, inicio + maximo);
  inicio = Math.max(0, fim - maximo);
  return Array.from({ length: fim - inicio }, (_, i) => inicio + i);
}

/** Pager do modo servidor de TabelaLista — navegação real via `<Link>`, `pagina` é 1-indexado (mesma convenção da URL). */
function PagerServidor({
  pagina,
  totalPaginas,
  totalRegistros,
  tamanhoPagina,
  hrefBase,
}: {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
  tamanhoPagina: number;
  hrefBase: string;
}) {
  const indiceAtual0 = pagina - 1;
  const inicio = indiceAtual0 * tamanhoPagina + 1;
  const fim = Math.min(pagina * tamanhoPagina, totalRegistros);

  return (
    <div className="flex items-center justify-between border-t border-border px-4.5 py-3 text-xs text-muted-foreground">
      <span>
        Mostrando {inicio}–{fim} de {totalRegistros}
      </span>
      <div className="flex items-center gap-1.5">
        {pagina > 1 ? (
          <Link
            href={hrefComPagina(hrefBase, pagina - 1)}
            className="flex size-6.5 items-center justify-center rounded-[7px] bg-muted text-muted-foreground transition-colors hover:text-foreground"
          >
            <CaretLeft size={12} weight="bold" />
          </Link>
        ) : (
          <span className="flex size-6.5 items-center justify-center rounded-[7px] bg-muted text-muted-foreground opacity-40">
            <CaretLeft size={12} weight="bold" />
          </span>
        )}
        {paginasVisiveis(indiceAtual0, totalPaginas).map((i) => (
          <Link
            key={i}
            href={hrefComPagina(hrefBase, i + 1)}
            className={cn(
              "flex size-6.5 items-center justify-center rounded-[7px] text-[11px] font-semibold transition-colors",
              i === indiceAtual0 ? "bg-foreground text-white" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {i + 1}
          </Link>
        ))}
        {pagina < totalPaginas ? (
          <Link
            href={hrefComPagina(hrefBase, pagina + 1)}
            className="flex size-6.5 items-center justify-center rounded-[7px] bg-muted text-muted-foreground transition-colors hover:text-foreground"
          >
            <CaretRight size={12} weight="bold" />
          </Link>
        ) : (
          <span className="flex size-6.5 items-center justify-center rounded-[7px] bg-muted text-muted-foreground opacity-40">
            <CaretRight size={12} weight="bold" />
          </span>
        )}
      </div>
    </div>
  );
}

interface TabelaListaProps<TData extends Record<string, any>> {
  titulo: string;
  data: TData[];
  columns: ColunaLista<TData>[];
  buscaPlaceholder?: string;
  tamanhoPagina?: number;
  /** Desliga a caixa de busca — pra listas curtas e fixas (ex: "Top 10") onde ela só ocupa espaço. */
  busca?: boolean;
  /** Mensagem quando `data` já chega vazio (não é o caso de busca sem resultado, que sempre mostra "Nada encontrado"). */
  textoVazio?: string;
  /** Itens do DropdownMenu de ação por linha — se omitido, a coluna de ação some. Ignorado quando `linkPara` está presente. */
  acoes?: (linha: TData) => ReactNode;
  /** Linha inteira clicável, navegando pro href retornado — sem coluna de ação. Pra listas onde clicar em qualquer parte da linha já é o fluxo natural (ex: ir pro detalhe da pessoa). */
  linkPara?: (linha: TData) => string;
  /** Desliga o realce de fundo ao passar o mouse na linha inteira — pra tabelas onde só ALGUMAS células são clicáveis (não `linkPara`, links próprios dentro de células específicas), pra não sugerir que a linha inteira navega quando não navega (achado em revisão de código: centro-custo-tabela.tsx). Sem efeito se `linkPara` estiver presente. */
  hoverLinha?: boolean;
  /**
   * Modo servidor: `data` já chega sendo só a página atual (a query fez
   * `.range()`), não a lista inteira do tenant — achado em auditoria de
   * escalabilidade (30/08/2026), telas de uso diário buscavam todo o
   * histórico pra paginar só no navegador. Quando presente, o pager usa
   * `<Link>` de navegação real (troca `?pagina=`) em vez do estado interno
   * do TanStack Table, a contagem do cabeçalho usa `totalRegistros` (não
   * o tamanho de `data`), e a ordenação por coluna some — só a página
   * atual está em memória, ordenar clicando na coluna reordenaria apenas
   * essas linhas, resultado enganoso. Busca (`busca`) é ignorada nesse
   * modo pelo mesmo motivo. `hrefBase` é o caminho da própria tela, com
   * qualquer outro filtro já aplicado (ex. "/vendas?situacao=aprovada").
   */
  paginacaoServidor?: { pagina: number; totalPaginas: number; totalRegistros: number; tamanhoPagina: number; hrefBase: string };
}

export function TabelaLista<TData extends Record<string, any>>({
  titulo,
  data,
  columns,
  buscaPlaceholder = "Buscar…",
  tamanhoPagina = 10,
  busca = true,
  textoVazio = "Nada encontrado.",
  acoes,
  linkPara,
  hoverLinha = true,
  paginacaoServidor,
}: TabelaListaProps<TData>) {
  const buscaHabilitada = busca && !paginacaoServidor;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  // Em modo servidor `data` já é só a página atual — pageSize gigante torna
  // a paginação interna do TanStack um no-op, pra não repaginar em cima da
  // página que o servidor já recortou.
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: paginacaoServidor ? Number.MAX_SAFE_INTEGER : tamanhoPagina,
  });

  const colunasFinais: ColunaLista<TData>[] = acoes && !linkPara
    ? [
        ...columns,
        {
          id: "_acoes",
          header: "",
          enableSorting: false,
          cell: ({ row }) => {
            const conteudo = acoes(row.original);
            if (!conteudo) return null;
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex size-7 items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <DotsThree size={18} weight="bold" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">{conteudo}</DropdownMenuContent>
              </DropdownMenu>
            );
          },
        },
      ]
    : columns;

  const table = useAppTable({
    data,
    columns: colunasFinais,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
  });

  const linhas = table.getRowModel().rows;
  const totalFiltrado = paginacaoServidor ? paginacaoServidor.totalRegistros : table.getFilteredRowModel().rows.length;
  const totalPaginas = paginacaoServidor ? paginacaoServidor.totalPaginas : table.getPageCount();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4.5 py-3.5">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-sm font-bold text-foreground">{titulo}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
            {totalFiltrado} {totalFiltrado === 1 ? "registro" : "registros"}
          </span>
        </div>
        {buscaHabilitada && (
          <div className="relative w-[180px]">
            <MagnifyingGlass size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalFilter}
              onChange={(evento) => setGlobalFilter(evento.target.value)}
              placeholder={buscaPlaceholder}
              className="h-8 pl-8 text-xs"
            />
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const podeOrdenar = !paginacaoServidor && header.column.getCanSort();
                  const ordenacao = header.column.getIsSorted();
                  const numerica = header.column.columnDef.meta?.numerica;
                  return (
                    <th
                      key={header.id}
                      onClick={podeOrdenar ? header.column.getToggleSortingHandler() : undefined}
                      className={cn(
                        "border-b border-border px-4.5 py-3 text-left text-[10.5px] font-bold tracking-wide text-muted-foreground uppercase",
                        numerica && "text-right",
                        podeOrdenar && "cursor-pointer select-none hover:text-foreground",
                        ordenacao && "text-primary hover:text-primary",
                      )}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {podeOrdenar && (
                        <span className={cn("ml-1 inline-block text-[9px]", ordenacao ? "opacity-100" : "opacity-35")}>
                          {ordenacao === "desc" ? "▼" : "▲"}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={colunasFinais.length} className="p-8 text-center text-sm text-muted-foreground">
                  {data.length === 0 ? textoVazio : "Nada encontrado."}
                </td>
              </tr>
            ) : (
              linhas.map((row) => (
                <tr key={row.id} className={cn("group border-b border-border last:border-none", hoverLinha && "hover:bg-muted/40", linkPara && "cursor-pointer")}>
                  {row.getAllCells().map((cell, i) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "align-middle",
                        cell.column.columnDef.meta?.numerica && "text-right",
                        i === 0 && "relative",
                        linkPara ? "p-0" : "px-4.5 py-3.5",
                      )}
                    >
                      {i === 0 && (
                        <span className="absolute inset-y-0 left-0 w-[3px] scale-y-0 rounded-full bg-primary transition-transform group-hover:scale-y-100" />
                      )}
                      {linkPara ? (
                        <Link href={linkPara(row.original)} className="block px-4.5 py-3.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Link>
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && paginacaoServidor && (
        <PagerServidor
          pagina={paginacaoServidor.pagina}
          totalPaginas={totalPaginas}
          totalRegistros={totalFiltrado}
          tamanhoPagina={paginacaoServidor.tamanhoPagina}
          hrefBase={paginacaoServidor.hrefBase}
        />
      )}
      {totalPaginas > 1 && !paginacaoServidor && (
        <div className="flex items-center justify-between border-t border-border px-4.5 py-3 text-xs text-muted-foreground">
          <span>
            Mostrando {pagination.pageIndex * tamanhoPagina + 1}–{Math.min((pagination.pageIndex + 1) * tamanhoPagina, totalFiltrado)} de {totalFiltrado}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex size-6.5 items-center justify-center rounded-[7px] bg-muted text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <CaretLeft size={12} weight="bold" />
            </button>
            {paginasVisiveis(pagination.pageIndex, totalPaginas).map((i) => (
              <button
                key={i}
                onClick={() => table.setPageIndex(i)}
                className={cn(
                  "flex size-6.5 items-center justify-center rounded-[7px] text-[11px] font-semibold transition-colors",
                  i === pagination.pageIndex ? "bg-foreground text-white" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex size-6.5 items-center justify-center rounded-[7px] bg-muted text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <CaretRight size={12} weight="bold" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
