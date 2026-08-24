"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const GRUPOS = [
  {
    rotulo: "Cadastros",
    itens: [
      { href: "/configuracoes/categorias", rotulo: "Categorias" },
      { href: "/configuracoes/plano-de-contas", rotulo: "Plano de contas" },
      { href: "/configuracoes/centros-custo", rotulo: "Centros de custo" },
      { href: "/configuracoes/formas-pagamento", rotulo: "Formas de pagamento" },
      { href: "/configuracoes/contas-financeiras", rotulo: "Contas financeiras" },
    ],
  },
  {
    rotulo: "Automação",
    itens: [
      { href: "/configuracoes/regras-categorizacao", rotulo: "Regras de categorização" },
      { href: "/configuracoes/mapeamento-colunas", rotulo: "Mapeamento de colunas" },
      { href: "/configuracoes/recorrencias", rotulo: "Recorrências" },
    ],
  },
  {
    rotulo: "Personalização",
    itens: [
      { href: "/configuracoes/campos-personalizados", rotulo: "Campos personalizados" },
      { href: "/configuracoes/estrutura-dre", rotulo: "Estrutura de DRE" },
    ],
  },
  {
    rotulo: "Equipe",
    itens: [{ href: "/configuracoes/equipe", rotulo: "Equipe" }],
  },
] as const;

// Mesmo padrão de sub-nav agrupada da seção de Relatórios (ver
// relatorios/sub-nav.tsx) — 10 pills soltas numa linha só, sem hierarquia,
// tinham o mesmo problema de "parede de laranja" que a sub-nav de
// Relatórios tinha antes da reforma. Grupo de 1 item só ("Equipe") não
// ganha o cartão de fundo, só o rótulo — mesma regra, evita caixa vazia
// em volta de uma pill sozinha.
export function ConfiguracoesSubNav() {
  const pathname = usePathname();

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
                    href={item.href}
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
