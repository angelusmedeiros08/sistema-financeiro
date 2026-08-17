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
  ShoppingCart,
  Package,
  ChartLine,
  ChartLineUp,
  ChartBar,
  PiggyBank,
  UploadSimple,
  GearSix,
  CaretRight,
  CaretLeft,
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

const SUB_ITENS_RELATORIOS: SubItemNav[] = [
  { href: "/relatorios/visao-geral", label: "Visão geral" },
  { href: "/relatorios/dre", label: "DRE" },
  { href: "/relatorios/dfc", label: "DFC" },
  { href: "/relatorios/centro-custo", label: "Centro de custo" },
  { href: "/relatorios/aging", label: "Aging" },
  { href: "/relatorios/despesas", label: "Análise de despesas" },
  { href: "/relatorios/ponto-equilibrio", label: "Ponto de equilíbrio" },
  { href: "/relatorios/comparativos", label: "Comparativos" },
  { href: "/relatorios/contas-bancarias", label: "Contas bancárias" },
];

const SUB_ITENS_CONFIGURACOES: SubItemNav[] = [
  { href: "/configuracoes/categorias", label: "Categorias" },
  { href: "/configuracoes/plano-de-contas", label: "Plano de contas" },
  { href: "/configuracoes/centros-custo", label: "Centros de custo" },
  { href: "/configuracoes/formas-pagamento", label: "Formas de pagamento" },
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
  { href: "/vendas", label: "Vendas", icon: ShoppingCart, disponivel: true },
  { href: "/produtos-servicos", label: "Produtos e serviços", icon: Package, disponivel: true },
  { href: "/fluxo-caixa", label: "Fluxo de caixa", icon: ChartLine, disponivel: true },
  { href: "/orcamento", label: "Orçamento", icon: PiggyBank, disponivel: true },
  { href: "/relatorios", label: "Relatórios", icon: ChartLineUp, disponivel: true, subItens: SUB_ITENS_RELATORIOS },
  { href: "/indicadores", label: "Indicadores", icon: ChartBar, disponivel: true },
  { href: "/importacao", label: "Importação", icon: UploadSimple, disponivel: true },
  { href: "/configuracoes", label: "Configurações", icon: GearSix, disponivel: true, subItens: SUB_ITENS_CONFIGURACOES },
];

function grupoPelaRota(pathname: string): string | null {
  const item = ITENS_NAV.find((i) => i.subItens && (pathname === i.href || pathname.startsWith(i.href + "/")));
  return item?.href ?? null;
}

export function SidebarConteudo() {
  const pathname = usePathname();
  // Mesmo padrão do Conta Azul: clicar num item com sub-itens não expande
  // em linha (isso é o que empurrava "Equipe" pra fora da tela quando dois
  // grupos abriam ao mesmo tempo) — troca a sidebar inteira pra uma lista
  // dedicada daquele grupo, com um botão de voltar no topo. Só um grupo
  // por vez, sempre cabe na tela.
  const [grupoAberto, setGrupoAberto] = useState<string | null>(() => grupoPelaRota(pathname));
  const itemDoGrupo = ITENS_NAV.find((i) => i.href === grupoAberto);

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

      {itemDoGrupo?.subItens ? (
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          <button
            type="button"
            onClick={() => setGrupoAberto(null)}
            className="mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-white"
          >
            <CaretLeft size={15} />
            {itemDoGrupo.label}
          </button>

          {itemDoGrupo.subItens.map((sub) => {
            const ativo = pathname === sub.href;
            return (
              <Link
                key={sub.href}
                href={sub.href}
                className={cn(
                  "rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  ativo ? "bg-sidebar-accent text-white" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white",
                )}
              >
                {sub.label}
              </Link>
            );
          })}
        </nav>
      ) : (
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
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => setGrupoAberto(item.href)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                    dentroDaSecao
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white",
                  )}
                >
                  <Icon size={17} weight={dentroDaSecao ? "bold" : "regular"} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <CaretRight size={13} />
                </button>
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
      )}
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
