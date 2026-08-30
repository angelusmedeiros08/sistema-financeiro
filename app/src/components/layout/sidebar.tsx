"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Receipt,
  Coins,
  HandCoins,
  CreditCard,
  Users,
  ShoppingCart,
  ChartLine,
  ChartLineUp,
  ChartBar,
  UploadSimple,
  GearSix,
  CaretRight,
  CaretLeft,
  Star,
  Presentation,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SubItemNav = { href: string; label: string };

type ItemNav = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill"; className?: string }>;
  disponivel: boolean;
  secao?: string;
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

const SUB_ITENS_PESSOAS: SubItemNav[] = [
  { href: "/clientes", label: "Clientes" },
  { href: "/fornecedores", label: "Fornecedores" },
];

const SUB_ITENS_COMERCIAL: SubItemNav[] = [
  { href: "/vendas", label: "Vendas" },
  { href: "/orcamentos", label: "Orçamentos" },
  { href: "/produtos-servicos", label: "Produtos e serviços" },
];

const SUB_ITENS_ANALISE: SubItemNav[] = [
  { href: "/previsionamento", label: "Previsionamento" },
  { href: "/indicadores", label: "Indicadores" },
];

const ITENS_NAV: ItemNav[] = [
  { href: "/painel", label: "Painel", icon: SquaresFour, disponivel: true },
  { href: "/receitas", label: "Receitas", icon: Coins, disponivel: true },
  { href: "/despesas", label: "Despesas", icon: Receipt, disponivel: true },
  { href: "/contas-a-receber", label: "Contas a receber", icon: HandCoins, disponivel: true },
  { href: "/contas-a-pagar", label: "Contas a pagar", icon: CreditCard, disponivel: true },
  { href: "/fluxo-caixa", label: "Fluxo de caixa", icon: ChartLine, disponivel: true },
  { href: "/pessoas", label: "Pessoas", icon: Users, disponivel: true, secao: "Gestão", subItens: SUB_ITENS_PESSOAS },
  { href: "/comercial", label: "Comercial", icon: ShoppingCart, disponivel: true, secao: "Gestão", subItens: SUB_ITENS_COMERCIAL },
  { href: "/analise", label: "Análise", icon: ChartBar, disponivel: true, secao: "Gestão", subItens: SUB_ITENS_ANALISE },
  { href: "/relatorios", label: "Relatórios", icon: ChartLineUp, disponivel: true, secao: "Sistema", subItens: SUB_ITENS_RELATORIOS },
  { href: "/apresentacoes", label: "Apresentação", icon: Presentation, disponivel: true, secao: "Sistema" },
  { href: "/importacao", label: "Importação", icon: UploadSimple, disponivel: true, secao: "Sistema" },
  { href: "/configuracoes", label: "Configurações", icon: GearSix, disponivel: true, secao: "Sistema", subItens: SUB_ITENS_CONFIGURACOES },
];

export const TODOS_ITENS_FOLHA: SubItemNav[] = ITENS_NAV.flatMap((item) =>
  item.subItens ? item.subItens : [{ href: item.href, label: item.label }],
);

function chaveFavoritos(emailUsuario?: string) {
  return `finanssi:sidebar:favoritos:${emailUsuario ?? "anon"}`;
}

function itemAtivo(item: ItemNav, pathname: string): boolean {
  if (pathname === item.href || pathname.startsWith(item.href + "/")) return true;
  return item.subItens?.some((s) => pathname === s.href || pathname.startsWith(s.href + "/")) ?? false;
}

function grupoPelaRota(pathname: string): string | null {
  const item = ITENS_NAV.find((i) => i.subItens && itemAtivo(i, pathname));
  return item?.href ?? null;
}

function BotaoEstrela({ ativo, onToggle }: { ativo: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      title={ativo ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={cn(
        "shrink-0 rounded-md p-1 transition-opacity",
        ativo ? "text-[#C99A3B] opacity-100" : "text-muted-foreground/50 opacity-0 hover:text-[#C99A3B] group-hover/item:opacity-100 focus-visible:opacity-100",
      )}
    >
      <Star size={13} weight={ativo ? "fill" : "regular"} />
    </button>
  );
}

// Sidebar sempre em repouso como rail de ícones (~60px); passar o mouse (ou
// foco de teclado) sobrepõe um painel completo com rótulos por cima do
// conteúdo — nunca empurra o layout. Mecanismo único (não há mais um estado
// "expandida fixa"), igual ao comportamento da Conta Azul/Uxcel observado.
export function SidebarConteudo({ emailUsuario, emSheet = false }: { emailUsuario?: string; emSheet?: boolean }) {
  const pathname = usePathname();

  const [grupoAberto, setGrupoAberto] = useState<string | null>(() => grupoPelaRota(pathname));
  const [aberta, setAberta] = useState(false);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const favoritosHidratados = useRef(false);
  const timerAbrir = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerFechar = useRef<ReturnType<typeof setTimeout> | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(chaveFavoritos(emailUsuario));
      setFavoritos(bruto ? JSON.parse(bruto) : []);
    } catch {
      setFavoritos([]);
    }
    favoritosHidratados.current = true;
  }, [emailUsuario]);

  useEffect(() => {
    if (!favoritosHidratados.current) return;
    window.localStorage.setItem(chaveFavoritos(emailUsuario), JSON.stringify(favoritos));
  }, [favoritos, emailUsuario]);

  function alternarFavorito(href: string, label: string) {
    setFavoritos((prev) => {
      const jaEra = prev.includes(href);
      toast(jaEra ? `${label} removido dos favoritos` : `${label} adicionado aos favoritos`);
      return jaEra ? prev.filter((h) => h !== href) : [...prev, href];
    });
  }

  function limparTimers() {
    if (timerAbrir.current) clearTimeout(timerAbrir.current);
    if (timerFechar.current) clearTimeout(timerFechar.current);
  }

  function agendarAbrir() {
    limparTimers();
    timerAbrir.current = setTimeout(() => setAberta(true), 100);
  }

  function agendarFechar() {
    limparTimers();
    timerFechar.current = setTimeout(() => setAberta(false), 250);
  }

  function aoFocar() {
    limparTimers();
    setAberta(true);
  }

  function aoPerderFoco(e: React.FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      limparTimers();
      setAberta(false);
    }
  }

  useEffect(() => {
    if (!aberta) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        limparTimers();
        setAberta(false);
        railRef.current?.focus();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta]);

  const itemDoGrupo = ITENS_NAV.find((i) => i.href === grupoAberto);
  const itensFavoritados = favoritos
    .map((href) => TODOS_ITENS_FOLHA.find((i) => i.href === href))
    .filter((i): i is SubItemNav => Boolean(i));

  function renderLista() {
    if (itemDoGrupo?.subItens) {
      return (
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          <button
            type="button"
            onClick={() => setGrupoAberto(null)}
            className="mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CaretLeft size={15} />
            {itemDoGrupo.label}
          </button>

          {itemDoGrupo.subItens.map((sub) => {
            const ativo = pathname === sub.href;
            const favoritado = favoritos.includes(sub.href);
            return (
              <div key={sub.href} className="group/item flex items-center gap-1">
                <Link
                  href={sub.href}
                  className={cn(
                    "flex-1 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                    ativo ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {sub.label}
                </Link>
                <BotaoEstrela ativo={favoritado} onToggle={() => alternarFavorito(sub.href, sub.label)} />
              </div>
            );
          })}
        </nav>
      );
    }

    let secaoAnterior: string | undefined;

    return (
      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {itensFavoritados.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="px-2.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">
              Favoritos
            </span>
            {itensFavoritados.map((fav) => {
              const ativo = pathname === fav.href;
              return (
                <div key={fav.href} className="group/item flex items-center gap-1">
                  <Link
                    href={fav.href}
                    className={cn(
                      "flex-1 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      ativo ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {fav.label}
                  </Link>
                  <BotaoEstrela ativo onToggle={() => alternarFavorito(fav.href, fav.label)} />
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          {ITENS_NAV.map((item) => {
            const ativo = itemAtivo(item, pathname);
            const Icon = item.icon;
            const favoritado = !item.subItens && favoritos.includes(item.href);
            const mostrarCabecalho = item.secao && item.secao !== secaoAnterior;
            secaoAnterior = item.secao;

            const conteudoItem = (() => {
              if (!item.disponivel) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground/50"
                    title="Em breve"
                  >
                    <Icon size={17} weight="regular" />
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
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
                      ativo ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon size={17} weight={ativo ? "bold" : "regular"} />
                    <span className="flex-1 text-left">{item.label}</span>
                    <CaretRight size={13} />
                  </button>
                );
              }

              return (
                <div key={item.href} className="group/item flex items-center gap-1">
                  <Link
                    href={item.href}
                    className={cn(
                      "flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                      ativo ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon size={17} weight={ativo ? "bold" : "regular"} />
                    {item.label}
                  </Link>
                  <BotaoEstrela ativo={favoritado} onToggle={() => alternarFavorito(item.href, item.label)} />
                </div>
              );
            })();

            return (
              <div key={item.href}>
                {mostrarCabecalho && (
                  <span className="mt-3 mb-1 block px-2.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">
                    {item.secao}
                  </span>
                )}
                {conteudoItem}
              </div>
            );
          })}
        </div>
      </nav>
    );
  }

  if (emSheet) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-6 bg-card px-4 py-6 text-foreground">
        <div className="flex shrink-0 items-center gap-2.5 px-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-[#D8583A] to-[#A87C1F] font-heading text-[11px] font-bold text-white">
            F
          </span>
          <span className="font-heading text-[15px] font-bold tracking-tight">Finanssi</span>
        </div>
        {renderLista()}
      </div>
    );
  }

  return (
    <aside className="relative hidden w-[60px] shrink-0 lg:block">
      <div
        ref={railRef}
        tabIndex={-1}
        className="fixed inset-y-0 left-0 z-40 h-screen w-[60px] outline-none"
        onMouseEnter={agendarAbrir}
        onMouseLeave={agendarFechar}
        onFocus={aoFocar}
        onBlur={aoPerderFoco}
      >
        {/* Rail: sempre visível, ícones apenas — fica no fluxo normal (nunca some), reserva o espaço fixo do layout. */}
        <div className="flex h-full flex-col items-center gap-1 border-r border-border bg-card px-2 py-6 text-foreground">
          <div className="mb-5 flex size-9 shrink-0 items-center justify-center">
            <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-[#D8583A] to-[#A87C1F] font-heading text-[11px] font-bold text-white">
              N
            </span>
          </div>

          {ITENS_NAV.map((item) => {
            const ativo = itemAtivo(item, pathname);
            const Icon = item.icon;

            if (!item.disponivel) {
              return (
                <div
                  key={item.href}
                  title={`${item.label} (em breve)`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground/40"
                >
                  <Icon size={18} weight="regular" />
                </div>
              );
            }

            if (item.subItens) {
              return (
                <div
                  key={item.href}
                  title={item.label}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    ativo ? "bg-muted text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="sr-only">{item.label}</span>
                  <Icon size={18} weight={ativo ? "bold" : "regular"} />
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                  ativo ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className="sr-only">{item.label}</span>
                <Icon size={18} weight={ativo ? "bold" : "regular"} />
              </Link>
            );
          })}
        </div>

        {/* Overlay: some sobre o conteúdo ao passar o mouse/focar, nunca reflui o layout por baixo. */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-[260px] border-r border-border shadow-2xl transition-[opacity,transform] duration-150",
            aberta ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none -translate-x-2 opacity-0",
          )}
        >
          <div className="flex h-full min-h-0 flex-col gap-6 bg-card px-4 py-6 text-foreground">
            <div className="flex shrink-0 items-center gap-2.5 px-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-[#D8583A] to-[#A87C1F] font-heading text-[11px] font-bold text-white">
                F
              </span>
              <span className="font-heading text-[15px] font-bold tracking-tight">Finanssi</span>
            </div>
            {renderLista()}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function Sidebar({ emailUsuario }: { emailUsuario?: string }) {
  return (
    <div className="hidden lg:block">
      <SidebarConteudo emailUsuario={emailUsuario} />
    </div>
  );
}
