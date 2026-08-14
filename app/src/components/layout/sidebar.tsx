"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Receipt,
  Coins,
  HandCoins,
  CreditCard,
  Users,
  Truck,
  ChartLineUp,
  GearSix,
  CaretDown,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type SubItemNav = { href: string; label: string };

type ItemNav = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill"; className?: string }>;
  disponivel: boolean;
  subItens?: SubItemNav[];
};

// Mesmo padrão do Conta Azul (grupo "Financeiro" na sidebar expande em
// sub-itens em vez de navegar direto) — clicar em Relatórios abre a lista
// dos 8 relatórios ali mesmo, sem precisar entrar na seção pra escolher.
const SUB_ITENS_RELATORIOS: SubItemNav[] = [
  { href: "/relatorios/visao-geral", label: "Visão geral" },
  { href: "/relatorios/dre", label: "DRE" },
  { href: "/relatorios/fluxo-caixa", label: "Fluxo de caixa" },
  { href: "/relatorios/centro-custo", label: "Centro de custo" },
  { href: "/relatorios/aging", label: "Aging" },
  { href: "/relatorios/despesas", label: "Análise de despesas" },
  { href: "/relatorios/comparativos", label: "Comparativos" },
  { href: "/relatorios/contas-bancarias", label: "Contas bancárias" },
];

const SUB_ITENS_CONFIGURACOES: SubItemNav[] = [
  { href: "/configuracoes/centros-custo", label: "Centros de custo" },
  { href: "/configuracoes/contas-financeiras", label: "Contas financeiras" },
  { href: "/configuracoes/recorrencias", label: "Recorrências" },
  { href: "/configuracoes/campos-personalizados", label: "Campos personalizados" },
  { href: "/configuracoes/estrutura-dre", label: "Estrutura de DRE" },
  { href: "/configuracoes/equipe", label: "Equipe" },
];

const ITENS_NAV: ItemNav[] = [
  { href: "/painel", label: "Painel", icon: SquaresFour, disponivel: true },
  { href: "/receitas", label: "Receitas", icon: Coins, disponivel: true },
  { href: "/despesas", label: "Despesas", icon: Receipt, disponivel: true },
  { href: "/contas-a-receber", label: "Contas a receber", icon: HandCoins, disponivel: true },
  { href: "/contas-a-pagar", label: "Contas a pagar", icon: CreditCard, disponivel: true },
  { href: "/clientes", label: "Clientes", icon: Users, disponivel: true },
  { href: "/fornecedores", label: "Fornecedores", icon: Truck, disponivel: true },
  { href: "/relatorios", label: "Relatórios", icon: ChartLineUp, disponivel: true, subItens: SUB_ITENS_RELATORIOS },
  { href: "/configuracoes", label: "Configurações", icon: GearSix, disponivel: true, subItens: SUB_ITENS_CONFIGURACOES },
];

export function SidebarConteudo() {
  const pathname = usePathname();
  const [expandidoManual, setExpandidoManual] = useState<Record<string, boolean>>({});

  return (
    <div className="flex h-full min-h-0 flex-col gap-8 bg-sidebar px-4 py-6 text-sidebar-foreground">
      <div className="flex shrink-0 items-center gap-2.5 px-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#6A56D8] to-[#D8583A]">
          <svg viewBox="0 0 24 24" className="size-3.5 stroke-white" fill="none" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h16M4 6h16M4 18h10" />
          </svg>
        </span>
        <span className="font-heading text-[15px] font-bold tracking-tight">Núcleo</span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {ITENS_NAV.map((item) => {
          const dentroDaSecao = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          if (!item.disponivel) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-sidebar-foreground/35"
                title="Em breve"
              >
                <Icon size={17} weight="regular" />
                <span className="flex-1">{item.label}</span>
                <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  em breve
                </span>
              </div>
            );
          }

          if (item.subItens) {
            const expandido = expandidoManual[item.href] ?? dentroDaSecao;
            return (
              <div key={item.href}>
                <button
                  type="button"
                  onClick={() => setExpandidoManual((atual) => ({ ...atual, [item.href]: !expandido }))}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                    dentroDaSecao
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white",
                  )}
                >
                  <Icon size={17} weight={dentroDaSecao ? "bold" : "regular"} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <CaretDown size={13} className={cn("transition-transform", expandido && "rotate-180")} />
                </button>

                {expandido && (
                  <div className="mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-sidebar-foreground/15 pl-3.5 ml-4.5">
                    {item.subItens.map((sub) => {
                      const ativo = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={cn(
                            "rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                            ativo
                              ? "bg-sidebar-accent/70 text-white"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-white",
                          )}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                dentroDaSecao
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white",
              )}
            >
              <Icon size={17} weight={dentroDaSecao ? "bold" : "regular"} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-sidebar-border lg:block">
      <div className="sticky top-0 h-screen">
        <SidebarConteudo />
      </div>
    </aside>
  );
}
