"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const ITENS = [
  { href: "/relatorios/visao-geral", rotulo: "Visão geral" },
  { href: "/relatorios/dre", rotulo: "DRE" },
  { href: "/relatorios/fluxo-caixa", rotulo: "Fluxo de caixa" },
  { href: "/relatorios/centro-custo", rotulo: "Centro de custo" },
  { href: "/relatorios/aging", rotulo: "Aging" },
  { href: "/relatorios/despesas", rotulo: "Análise de despesas" },
  { href: "/relatorios/ponto-equilibrio", rotulo: "Ponto de equilíbrio" },
  { href: "/relatorios/orcado-realizado", rotulo: "Orçado × Realizado" },
  { href: "/relatorios/comparativos", rotulo: "Comparativos" },
  { href: "/relatorios/contas-bancarias", rotulo: "Contas bancárias" },
] as const;

// Sub-nav plana (mesmo padrão de ConfiguracoesSubNav) — "Visão geral" é o
// dashboard consolidado, os demais itens são os relatórios detalhados.
// Preserva regime/granularidade/período ao trocar de relatório: o querystring
// atual é anexado a cada link.
export function RelatoriosSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <div className="flex flex-wrap gap-1 border-b border-border pb-3">
      {ITENS.map((item) => (
        <Link
          key={item.href}
          href={query ? `${item.href}?${query}` : item.href}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            pathname.startsWith(item.href) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {item.rotulo}
        </Link>
      ))}
    </div>
  );
}
