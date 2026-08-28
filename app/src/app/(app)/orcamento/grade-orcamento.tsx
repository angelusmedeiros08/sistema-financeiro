"use client";

import { useState, useTransition } from "react";
import { CaretDown } from "@phosphor-icons/react";
import type { LinhaGradeOrcamento } from "@/lib/orcamento/orcamento";
import { definirValorOrcamentoAction, copiarValorParaRestoDoAnoAction } from "@/lib/orcamento/orcamento-actions";
import { cn } from "@/lib/utils";
import { TabelaMatriz, criarColunaMatriz } from "@/components/tabela/tabela-matriz";

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const IDS_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatarEdicao(valor: number): string {
  return valor === 0 ? "" : valor.toFixed(2).replace(".", ",");
}

function parseValor(texto: string): number {
  const numero = Number(texto.replace(",", "."));
  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

const helper = criarColunaMatriz<LinhaGradeOrcamento>();

// Grade categoria × 12 meses com autosave por célula (onBlur) — mesmo
// padrão de coluna fixa/tabela compacta da Matriz do DRE/DFC (TabelaMatriz,
// src/components/tabela/tabela-matriz.tsx), só que com célula editável em
// vez de valor calculado. Ordenação por header fica desligada de propósito
// aqui: reordenar linhas no meio de uma edição é uma superfície de risco
// nova (input perder referência/foco) que o grid antigo nunca teve e que o
// desenho aprovado não cobriu — não é regressão, é o comportamento de
// sempre, só herdando o resto do arquétipo (coluna fixa, mês atual, Total).
// "Copiar Jan pro resto do ano" pede confirmação só quando algum mês de
// destino já tem valor diferente de zero (evita sobrescrever sem querer).
export function GradeOrcamento({ ano, linhas }: { ano: number; linhas: LinhaGradeOrcamento[] }) {
  const [valores, setValores] = useState<Map<string, number>>(
    () => new Map(linhas.flatMap((l) => l.celulas.map((c) => [`${l.categoriaId}:${c.mes}`, c.valorPrevisto] as const))),
  );
  const [, iniciarTransicao] = useTransition();
  const [statusPorCategoria, setStatusPorCategoria] = useState<Map<string, "salvando" | "salvo" | "erro">>(new Map());

  function chave(categoriaId: string, mes: number) {
    return `${categoriaId}:${mes}`;
  }

  function marcarStatus(categoriaId: string, status: "salvando" | "salvo" | "erro") {
    setStatusPorCategoria((atual) => new Map(atual).set(categoriaId, status));
    if (status === "salvo") {
      setTimeout(() => {
        setStatusPorCategoria((atual) => {
          if (atual.get(categoriaId) !== "salvo") return atual;
          const proximo = new Map(atual);
          proximo.delete(categoriaId);
          return proximo;
        });
      }, 1500);
    }
  }

  function salvarCelula(categoriaId: string, mes: number, valor: number) {
    setValores((atual) => new Map(atual).set(chave(categoriaId, mes), valor));
    marcarStatus(categoriaId, "salvando");
    iniciarTransicao(async () => {
      const resultado = await definirValorOrcamentoAction({ categoriaId, ano, mes, valorPrevisto: valor });
      marcarStatus(categoriaId, "erro" in resultado ? "erro" : "salvo");
    });
  }

  function copiarParaRestoDoAno(categoriaId: string) {
    const valorJaneiro = valores.get(chave(categoriaId, 1)) ?? 0;
    const mesesComValor = Array.from({ length: 11 }, (_, i) => i + 2).filter((mes) => (valores.get(chave(categoriaId, mes)) ?? 0) > 0);

    if (mesesComValor.length > 0) {
      const confirmado = window.confirm(
        `${mesesComValor.length} mês(es) já têm valor preenchido nesta categoria. Copiar Jan pro resto do ano vai sobrescrever tudo. Continuar?`,
      );
      if (!confirmado) return;
    }

    setValores((atual) => {
      const proximo = new Map(atual);
      for (let mes = 2; mes <= 12; mes++) proximo.set(chave(categoriaId, mes), valorJaneiro);
      return proximo;
    });
    marcarStatus(categoriaId, "salvando");
    iniciarTransicao(async () => {
      const resultado = await copiarValorParaRestoDoAnoAction({ categoriaId, ano, mesOrigem: 1, valorPrevisto: valorJaneiro });
      marcarStatus(categoriaId, "erro" in resultado ? "erro" : "salvo");
    });
  }

  function totalAno(categoriaId: string): number {
    return Array.from({ length: 12 }, (_, i) => valores.get(chave(categoriaId, i + 1)) ?? 0).reduce((s, v) => s + v, 0);
  }

  // Versão mobile: grade horizontal de 12 colunas vira ilegível/impossível
  // de tocar numa tela estreita (célula caía pra ~20px, bem abaixo do
  // mínimo de 44px de alvo de toque) — aqui é uma categoria por vez,
  // expansível, com os 12 meses empilhados em coluna e input de altura
  // real. Mesmo estado/mesmas actions da grade desktop, só a apresentação
  // muda conforme a largura de tela (`hidden md:block` / `md:hidden`).
  function renderGrupoMobile(tipo: "RECEITA" | "DESPESA", titulo: string) {
    const linhasDoTipo = linhas.filter((l) => l.tipo === tipo);
    if (linhasDoTipo.length === 0) return null;

    return (
      <div className="mb-6 last:mb-0">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{titulo}</h3>
        <div className="flex flex-col gap-2">
          {linhasDoTipo.map((linha) => {
            const status = statusPorCategoria.get(linha.categoriaId);
            return (
              <details key={linha.categoriaId} className="group overflow-hidden rounded-xl border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 truncate text-sm font-semibold text-foreground">{linha.categoriaNome}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {status && (
                      <span className={cn("whitespace-nowrap text-[10px] font-medium", status === "erro" ? "text-destructive" : "text-muted-foreground")}>
                        {status === "salvando" ? "salvando…" : status === "erro" ? "erro" : "salvo"}
                      </span>
                    )}
                    <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-muted-foreground">R$ {formatarEdicao(totalAno(linha.categoriaId)) || "0,00"}</span>
                    <CaretDown size={14} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </span>
                </summary>

                <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
                  {linha.celulas.map((celula) => (
                    <div key={celula.mes} className="flex items-center gap-3">
                      <span className="w-9 shrink-0 text-xs font-medium text-muted-foreground">{NOMES_MES[celula.mes - 1]}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        defaultValue={formatarEdicao(valores.get(chave(linha.categoriaId, celula.mes)) ?? 0)}
                        placeholder="-"
                        className="h-11 flex-1 rounded-lg border border-border bg-muted/40 px-3 text-right text-base tabular-nums text-foreground outline-none focus:border-primary focus:bg-card"
                        onBlur={(e) => {
                          const valor = parseValor(e.target.value);
                          if (valor !== (valores.get(chave(linha.categoriaId, celula.mes)) ?? 0)) {
                            salvarCelula(linha.categoriaId, celula.mes, valor);
                          }
                        }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => copiarParaRestoDoAno(linha.categoriaId)}
                    className="mt-1 h-11 rounded-lg bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/70"
                  >
                    Copiar Jan pro resto do ano
                  </button>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    );
  }

  function renderGrupo(tipo: "RECEITA" | "DESPESA", titulo: string) {
    const linhasDoTipo = linhas.filter((l) => l.tipo === tipo);
    if (linhasDoTipo.length === 0) return null;

    const colunas = helper.columns([
      helper.accessor("categoriaNome", {
        id: "categoria",
        header: "Categoria",
        size: 170,
        enableSorting: false,
        cell: (info) => {
          const linha = info.row.original;
          const status = statusPorCategoria.get(linha.categoriaId);
          return (
            <span className="truncate" title={linha.categoriaNome}>
              {linha.categoriaNome}
              {status && (
                <span className={cn("ml-1.5 text-[9px] font-normal", status === "erro" ? "text-destructive" : "text-muted-foreground")}>
                  {status === "salvando" ? "salvando…" : status === "erro" ? "erro" : "salvo"}
                </span>
              )}
            </span>
          );
        },
      }),
      ...IDS_MES.map((id, i) =>
        helper.display({
          id,
          header: NOMES_MES[i],
          size: 76,
          meta: { numerica: true },
          cell: (info) => {
            const linha = info.row.original;
            const mes = i + 1;
            return (
              <input
                type="text"
                inputMode="decimal"
                defaultValue={formatarEdicao(valores.get(chave(linha.categoriaId, mes)) ?? 0)}
                placeholder="-"
                className="w-full rounded-md border border-border/60 bg-muted/40 px-2 py-1.5 text-right tabular-nums text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:bg-card"
                onBlur={(e) => {
                  const valor = parseValor(e.target.value);
                  if (valor !== (valores.get(chave(linha.categoriaId, mes)) ?? 0)) {
                    salvarCelula(linha.categoriaId, mes, valor);
                  }
                }}
              />
            );
          },
        }),
      ),
      helper.accessor((linha) => totalAno(linha.categoriaId), {
        id: "total",
        header: "Total",
        size: 90,
        meta: { numerica: true, totalizador: true },
        enableSorting: false,
        cell: (info) => <span>R$ {formatarEdicao(info.getValue()) || "0,00"}</span>,
      }),
      helper.display({
        id: "acao",
        header: "",
        cell: (info) => (
          <button
            type="button"
            onClick={() => copiarParaRestoDoAno(info.row.original.categoriaId)}
            className="whitespace-nowrap rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/70"
            title="Copia o valor de Janeiro pros outros 11 meses"
          >
            Jan → ano
          </button>
        ),
      }),
    ]);

    const anoAtual = new Date().getFullYear();
    const idMesAtual = ano === anoAtual ? IDS_MES[new Date().getMonth()] : undefined;

    return (
      <div className="mb-6 last:mb-0">
        <TabelaMatriz
          titulo={titulo}
          data={linhasDoTipo}
          columns={colunas}
          idsColunasFixas={["categoria"]}
          ehColunaMesAtual={idMesAtual ? (id) => id === idMesAtual : undefined}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="hidden md:block">
        {renderGrupo("RECEITA", "Receitas")}
        {renderGrupo("DESPESA", "Despesas")}
      </div>
      <div className="md:hidden">
        {renderGrupoMobile("RECEITA", "Receitas")}
        {renderGrupoMobile("DESPESA", "Despesas")}
      </div>
    </div>
  );
}
