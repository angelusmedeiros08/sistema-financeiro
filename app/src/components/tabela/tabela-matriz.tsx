"use client";

import { useState } from "react";
import {
  columnPinningFeature,
  columnSizingFeature,
  createSortedRowModel,
  createTableHook,
  flexRender,
  rowSortingFeature,
  tableFeatures,
  type CellData,
  type ColumnDef,
  type RowData,
  type SortingState,
  type TableFeatures,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";

// Arquétipo 1 (matriz densa) — pra DRE/DFC/Orçamento, tabelas de até ~38
// colunas mensais + linha configurável por tenant. Motor TanStack Table v9
// (API de registro explícito de feature — ver
// node_modules/@tanstack/react-table/skills/), coluna pinada de verdade
// (`column.getStart('start')`) pro "#" + "Linha" ficarem fixos no scroll
// horizontal.
//
// Pra ganhar o super-header de ano de graça, agrupe as colunas de mês sob
// uma coluna-pai com `columns: [...]` no ColumnDef — o TanStack já gera as
// duas linhas de cabeçalho (grupo + folha) e preenche célula vazia nas
// colunas sem grupo (# / Linha / Total / AV%), que é exatamente a forma da
// maquete aprovada.
//
// Cor é sempre estado de UI (terracota: mês atual, ordenação ativa, hover)
// OU semântica financeira (verde --positivo pro friso de subtotal, vermelho
// --destructive só via célula de valor que a página formata) — nunca as
// duas coisas juntas. Regra fixada depois da correção de token da Fatia 2.

const featuresMatriz = tableFeatures({
  rowSortingFeature,
  columnPinningFeature,
  columnSizingFeature,
  sortedRowModel: createSortedRowModel(),
});

const { createAppColumnHelper, useAppTable } = createTableHook({ features: featuresMatriz });

/** Helper tipado pra declarar colunas — `criarColunaMatriz<MinhaLinha>().accessor(...)`. */
export const criarColunaMatriz = createAppColumnHelper;

export type ColunaMatriz<TData extends Record<string, any>> = ColumnDef<typeof featuresMatriz, TData, any>;

declare module "@tanstack/react-table" {
  interface ColumnMeta<TFeatures extends TableFeatures, TData extends RowData, TValue extends CellData = CellData> {
    numerica?: boolean;
    /** Coluna "Total" — ganha negrito e leve destaque de fundo. */
    totalizador?: boolean;
  }
}

export type TipoLinhaMatriz = "detalhe" | "subtotal" | "final";

/** Valor tabular-nums colorido por sinal — recebe o texto já formatado (ex: "–" pra zero). */
export function ValorMatriz({ valor, formatado }: { valor: number; formatado: string }) {
  return <span className={valor > 0 ? "text-[#157F6B]" : valor < 0 ? "text-[#B23A2E]" : "text-[#ddd9cc]"}>{formatado}</span>;
}

/** Coluna AV% — percentual de participação com mini-barra horizontal. */
export function CelulaAV({ percentual, negativo = false }: { percentual: number; negativo?: boolean }) {
  const largura = Math.max(2, Math.min(100, Math.abs(percentual) * 100));
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1 w-8.5 overflow-hidden rounded-[3px] bg-muted">
        <span className="block h-full rounded-[3px]" style={{ width: `${largura}%`, background: negativo ? "#B23A2E" : "#157F6B" }} />
      </span>
      <span className="w-7.5 text-right text-[11px] font-semibold text-muted-foreground tabular-nums">
        {(percentual * 100).toLocaleString("pt-BR", { maximumFractionDigits: percentual !== 0 && Math.abs(percentual) < 0.01 ? 1 : 0 })}%
      </span>
    </span>
  );
}

/** Chip de variação (▲/▼) — opcional, ao lado de um valor. */
export function ChipDelta({ percentual }: { percentual: number }) {
  if (percentual === 0) return null;
  const sobe = percentual > 0;
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-bold",
        sobe ? "bg-[#157F6B]/10 text-[#157F6B]" : "bg-[#B23A2E]/9 text-[#B23A2E]",
      )}
    >
      {sobe ? "▲" : "▼"} {Math.abs(percentual * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
    </span>
  );
}

interface TabelaMatrizProps<TData extends Record<string, any>> {
  titulo: string;
  data: TData[];
  columns: ColunaMatriz<TData>[];
  /** Ids das colunas fixas à esquerda, na ordem — ex: `["numero", "linha"]`. */
  idsColunasFixas: string[];
  /**
   * Quais colunas contam como "mês corrente" (ganham tint + underline
   * terracota) — predicado em vez de um id único porque nem toda matriz tem
   * 1 coluna por mês: a DFC tem 3 (Prev./Real./Var.) por mês, por exemplo.
   */
  ehColunaMesAtual?: (idColuna: string) => boolean;
  obterTipoLinha?: (linha: TData) => TipoLinhaMatriz | undefined;
  /** Rodapé explicando as cores — desligue só se a tela já tiver uma legenda própria. */
  legenda?: boolean;
}

export function TabelaMatriz<TData extends Record<string, any>>({
  titulo,
  data,
  columns,
  idsColunasFixas,
  ehColunaMesAtual,
  obterTipoLinha,
  legenda = true,
}: TabelaMatrizProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useAppTable({
    data,
    columns,
    state: { sorting, columnPinning: { start: idsColunasFixas, end: [] } },
    onSortingChange: setSorting,
  });

  const idUltimaColunaFixa = idsColunasFixas[idsColunasFixas.length - 1];
  const idPrimeiraColunaFixa = idsColunasFixas[0];
  const temSubtotal = obterTipoLinha ? data.some((l) => obterTipoLinha(l) === "subtotal") : false;
  const temFinal = obterTipoLinha ? data.some((l) => obterTipoLinha(l) === "final") : false;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4.5 py-3.5">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-sm font-bold text-foreground">{titulo}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{data.length} linhas</span>
        </div>
      </div>

      <div
        className={cn(
          "overflow-x-auto",
          "[scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]",
          "[&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding [&::-webkit-scrollbar-thumb]:bg-border",
          "hover:[&::-webkit-scrollbar-thumb]:bg-[#d8c9bc]",
        )}
      >
        <table className="w-max min-w-full border-t border-l border-border border-separate border-spacing-0 text-[12.5px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const pinado = header.column.getIsPinned();
                  const ultimaFixa = header.column.id === idUltimaColunaFixa;
                  const primeiraFixa = header.column.id === idPrimeiraColunaFixa;
                  const mesAtual = ehColunaMesAtual?.(header.column.id) ?? false;
                  const numerica = header.column.columnDef.meta?.numerica;
                  const podeOrdenar = header.column.getCanSort();
                  const ordenacao = header.column.getIsSorted();
                  // Nem toda matriz agrupa coluna (Orçamento é totalmente
                  // "chata", sem super-header) — checar se ESTE header tem
                  // filho de verdade, não a profundidade da linha, senão
                  // uma tabela sem grupo nenhum trata sua única linha de
                  // cabeçalho (profundidade 0) como se fosse grupo.
                  const ehGrupo = header.column.columns.length > 0;

                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      onClick={!ehGrupo ? header.column.getToggleSortingHandler() : undefined}
                      className={cn(
                        "border-r border-b border-border bg-card px-4 text-right align-bottom font-bold tracking-wide text-muted-foreground uppercase",
                        ehGrupo ? "pt-2.5 pb-0 text-[10px]" : "py-2.5 text-[10.5px]",
                        !numerica && !ehGrupo && "text-left",
                        podeOrdenar && !ehGrupo && "cursor-pointer select-none hover:text-foreground",
                        (pinado || primeiraFixa) && "sticky z-10 bg-card",
                        ultimaFixa && "shadow-[6px_0_10px_-6px_rgba(0,0,0,0.12)]",
                        mesAtual && "text-[#c1502f]",
                        ordenacao && !ehGrupo && "text-primary hover:text-primary",
                      )}
                      style={pinado ? { left: header.column.getStart("start") } : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <>
                          {ehGrupo ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 font-bold text-muted-foreground normal-case">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </span>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                          {podeOrdenar && !ehGrupo && (
                            <span className={cn("ml-1 inline-block text-[9px]", ordenacao ? "opacity-100" : "opacity-35")}>
                              {ordenacao === "desc" ? "▼" : "▲"}
                            </span>
                          )}
                        </>
                      )}
                      {mesAtual && !ehGrupo && <span className="mt-1.5 block h-0.5 rounded-full bg-primary" />}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const tipo = obterTipoLinha?.(row.original);
              return (
                <tr key={row.id} className="group border-b border-[#f0eee7] last:border-none">
                  {row.getAllCells().map((cell, i) => {
                    const pinado = cell.column.getIsPinned();
                    const ultimaFixa = cell.column.id === idUltimaColunaFixa;
                    const primeiraFixa = cell.column.id === idPrimeiraColunaFixa;
                    const mesAtual = ehColunaMesAtual?.(cell.column.id) ?? false;
                    const numerica = cell.column.columnDef.meta?.numerica;
                    const totalizador = cell.column.columnDef.meta?.totalizador;

                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "relative border-r border-b border-border px-4 py-2.5 text-right align-middle whitespace-nowrap tabular-nums transition-colors",
                          !numerica && "text-left font-medium text-foreground",
                          (pinado || primeiraFixa) && "sticky z-[1] bg-card group-hover:bg-[#fbfaf8]",
                          ultimaFixa && "shadow-[6px_0_10px_-6px_rgba(0,0,0,0.12)]",
                          mesAtual && "bg-[#fdf6f3] group-hover:bg-[#fbf1ec]",
                          totalizador && "bg-[#fbfaf8] font-bold group-hover:bg-[#f5f3ee]",
                          tipo === "detalhe" && "text-muted-foreground",
                          tipo === "subtotal" && "font-bold text-foreground",
                          tipo === "final" && "text-[13.5px] font-extrabold text-foreground",
                        )}
                        style={pinado ? { left: cell.column.getStart("start") } : undefined}
                      >
                        {(i === 0 || primeiraFixa) && !(ultimaFixa && (tipo === "subtotal" || tipo === "final")) && (
                          <span className="absolute inset-y-0 left-0 w-[3px] scale-y-0 rounded-full bg-[#e5c3b6] transition-transform group-hover:scale-y-100" />
                        )}
                        {ultimaFixa && tipo === "detalhe" && <span className="inline-block w-2.5" aria-hidden />}
                        {ultimaFixa && (tipo === "subtotal" || tipo === "final") && (
                          <span
                            className="absolute top-0.5 bottom-0.5 left-0 w-[3px] rounded-full"
                            style={{ background: tipo === "subtotal" ? "#157F6B" : "#D8583A" }}
                          />
                        )}
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {legenda && (temSubtotal || temFinal || !!ehColunaMesAtual) && (
        <div className="flex flex-wrap items-center gap-4.5 border-t border-border bg-[#fbfaf8] px-4.5 py-3 text-[11px] text-muted-foreground">
          {temSubtotal && (
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: "#157F6B" }} /> Subtotal
            </span>
          )}
          {temFinal && (
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: "#D8583A" }} /> Resultado final
            </span>
          )}
          {ehColunaMesAtual && (
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] border border-border" style={{ background: "#fdf6f3" }} /> Mês atual
            </span>
          )}
        </div>
      )}
    </div>
  );
}
