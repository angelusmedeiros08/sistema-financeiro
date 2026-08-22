"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const GRUPOS = [
  {
    rotulo: "Geral",
    itens: [{ href: "/relatorios/visao-geral", rotulo: "Visão geral" }],
  },
  {
    rotulo: "Demonstrativos",
    itens: [
      { href: "/relatorios/dre", rotulo: "DRE" },
      { href: "/relatorios/dfc", rotulo: "DFC" },
    ],
  },
  {
    rotulo: "Análises",
    itens: [
      { href: "/relatorios/centro-custo", rotulo: "Centro de custo" },
      { href: "/relatorios/aging", rotulo: "Aging" },
      { href: "/relatorios/despesas", rotulo: "Análise de despesas" },
      { href: "/relatorios/ponto-equilibrio", rotulo: "Ponto de equilíbrio" },
      { href: "/relatorios/comparativos", rotulo: "Comparativos" },
    ],
  },
  {
    rotulo: "Contas",
    itens: [{ href: "/relatorios/contas-bancarias", rotulo: "Contas bancárias" }],
  },
] as const;

// Sub-nav agrupada por categoria (3ª rodada de mockup no companion visual,
// docs/superpowers/specs/2026-08-21-reforma-visual-tabelas-design.md não
// cobre isso — decisão tomada direto em chat) — 9 pills soltas numa linha
// flat não tinham hierarquia nenhuma, viravam "parede de laranja" junto com
// RelatoriosControles logo abaixo. Grupo de 1 item só ("Geral", "Contas")
// não ganha o cartão de fundo — só o rótulo, pra não criar uma caixa vazia
// em volta de uma pill sozinha.
// Preserva regime/granularidade/período ao trocar de relatório: o querystring
// atual é anexado a cada link.
export function RelatoriosSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-4">
      {GRUPOS.map((grupo) => {
        const grupoAtivo = grupo.itens.some((item) => pathname.startsWith(item.href));
        const solo = grupo.itens.length === 1;

        return (
          <div
            key={grupo.rotulo}
            className={cn(
              "flex flex-col gap-1.5 rounded-2xl",
              !solo && "px-2.5 pt-2 pb-2.5",
              !solo && (grupoAtivo ? "bg-primary/8" : "bg-muted/60"),
            )}
          >
            <span className={cn("px-0.5 text-[9.5px] font-bold tracking-wider uppercase", grupoAtivo ? "text-primary" : "text-muted-foreground")}>
              {grupo.rotulo}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {grupo.itens.map((item) => {
                const ativo = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={query ? `${item.href}?${query}` : item.href}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                      ativo
                        ? "bg-primary text-primary-foreground shadow-[0_3px_10px_-2px_rgba(216,88,58,0.45)]"
                        : solo
                          ? "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                          : "bg-card text-muted-foreground shadow-[0_1px_1px_rgba(26,29,31,0.04)] hover:text-foreground",
                    )}
                  >
                    {item.rotulo}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
