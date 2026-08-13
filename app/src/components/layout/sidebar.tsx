"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Receipt,
  HandCoins,
  CreditCard,
  ChartLineUp,
  GearSix,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type ItemNav = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill"; className?: string }>;
  disponivel: boolean;
};

const ITENS_NAV: ItemNav[] = [
  { href: "/painel", label: "Painel", icon: SquaresFour, disponivel: true },
  { href: "/despesas", label: "Despesas", icon: Receipt, disponivel: true },
  { href: "/contas-a-receber", label: "Contas a receber", icon: HandCoins, disponivel: false },
  { href: "/contas-a-pagar", label: "Contas a pagar", icon: CreditCard, disponivel: false },
  { href: "/relatorios", label: "Relatórios", icon: ChartLineUp, disponivel: false },
  { href: "/configuracoes", label: "Configurações", icon: GearSix, disponivel: false },
];

export function SidebarConteudo() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-8 bg-sidebar px-4 py-6 text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#6A56D8] to-[#D8583A]">
          <svg viewBox="0 0 24 24" className="size-3.5 stroke-white" fill="none" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h16M4 6h16M4 18h10" />
          </svg>
        </span>
        <span className="font-heading text-[15px] font-bold tracking-tight">Núcleo</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {ITENS_NAV.map((item) => {
          const ativo = pathname === item.href || pathname.startsWith(item.href + "/");
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

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                ativo
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white",
              )}
            >
              <Icon size={17} weight={ativo ? "bold" : "regular"} />
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
