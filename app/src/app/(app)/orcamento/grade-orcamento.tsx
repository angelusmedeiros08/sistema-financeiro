"use client";

import { useState, useTransition } from "react";
import { CaretDown } from "@phosphor-icons/react";
import type { LinhaGradeOrcamento } from "@/lib/orcamento/orcamento";
import { definirValorOrcamentoAction, copiarValorParaRestoDoAnoAction } from "@/lib/orcamento/orcamento-actions";
import { cn } from "@/lib/utils";

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatarEdicao(valor: number): string {
  return valor === 0 ? "" : valor.toFixed(2).replace(".", ",");
}

function parseValor(texto: string): number {
  const numero = Number(texto.replace(",", "."));
  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

// Grade categoria × 12 meses com autosave por célula (onBlur) — mesmo
// padrão de coluna fixa/tabela compacta já validado na Matriz do DRE.
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
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-semibold text-foreground">{linha.categoriaNome}</span>
                  <span className="flex items-center gap-2">
                    {status && (
                      <span className={cn("text-[10px] font-medium", status === "erro" ? "text-[#D8583A]" : "text-muted-foreground")}>
                        {status === "salvando" ? "salvando…" : status === "erro" ? "erro" : "salvo"}
                      </span>
                    )}
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">R$ {formatarEdicao(totalAno(linha.categoriaId)) || "0,00"}</span>
                    <CaretDown size={14} className="text-muted-foreground transition-transform group-open:rotate-180" />
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

    return (
      <div className="mb-6 last:mb-0">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{titulo}</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-separate border-spacing-0 text-xs">
            <colgroup>
              <col className="w-44" />
              {NOMES_MES.map((mes) => (
                <col key={mes} className="w-[72px]" />
              ))}
              <col className="w-24" />
            </colgroup>
            <thead>
              <tr className="text-left text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                <th className="sticky left-0 z-10 border-b border-border bg-card py-2 pr-2">Categoria</th>
                {NOMES_MES.map((mes) => (
                  <th key={mes} className="border-b border-border py-2 px-1.5 text-right">
                    {mes}
                  </th>
                ))}
                <th className="border-b border-border py-2 pl-2"></th>
              </tr>
            </thead>
            <tbody>
              {linhasDoTipo.map((linha) => {
                const status = statusPorCategoria.get(linha.categoriaId);
                return (
                  <tr key={linha.categoriaId}>
                    <td
                      className="sticky left-0 z-10 truncate border-b border-border bg-card py-2 pr-2 font-medium text-foreground"
                      title={linha.categoriaNome}
                    >
                      {linha.categoriaNome}
                      {status && (
                        <span className={cn("ml-1.5 text-[9px] font-normal", status === "erro" ? "text-[#D8583A]" : "text-muted-foreground")}>
                          {status === "salvando" ? "salvando…" : status === "erro" ? "erro" : "salvo"}
                        </span>
                      )}
                    </td>
                    {linha.celulas.map((celula) => (
                      <td key={celula.mes} className="border-b border-border py-1.5 px-1.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={formatarEdicao(valores.get(chave(linha.categoriaId, celula.mes)) ?? 0)}
                          placeholder="-"
                          className="w-full rounded-md border border-border/60 bg-muted/40 px-2 py-1.5 text-right tabular-nums text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:bg-card"
                          onBlur={(e) => {
                            const valor = parseValor(e.target.value);
                            if (valor !== (valores.get(chave(linha.categoriaId, celula.mes)) ?? 0)) {
                              salvarCelula(linha.categoriaId, celula.mes, valor);
                            }
                          }}
                        />
                      </td>
                    ))}
                    <td className="border-b border-border py-1.5 pl-2">
                      <button
                        type="button"
                        onClick={() => copiarParaRestoDoAno(linha.categoriaId)}
                        className="whitespace-nowrap rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/70"
                        title="Copia o valor de Janeiro pros outros 11 meses"
                      >
                        Jan → ano
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
