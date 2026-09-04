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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GRUPOS_CONFIGURACOES } from "@/app/(app)/configuracoes/grupos";
import { GRUPOS_RELATORIOS } from "@/app/(app)/relatorios/grupos";

type SubItemNav = { href: string; label: string };

type ItemNav = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill"; className?: string }>;
  disponivel: boolean;
  secao?: string;
  subItens?: SubItemNav[];
};

// Derivados das mesmas fontes únicas que os hubs/sub-navs in-page já usam
// (grupos.ts de cada seção) — antes eram listas hardcoded próprias deste
// arquivo, e a de Configurações tinha ficado pra trás (9 de 12 itens reais:
// faltavam Trilha de auditoria, Regras de categorização e Mapeamento de
// colunas — telas existentes e funcionais, mas invisíveis no menu lateral
// e na busca rápida Cmd+K, que deriva de TODOS_ITENS_FOLHA abaixo). Achado
// em varredura de melhorias — mesma classe de risco pra qualquer seção que
// mantenha duas listas separadas.
const SUB_ITENS_RELATORIOS: SubItemNav[] = GRUPOS_RELATORIOS.flatMap((g) => g.itens.map((i) => ({ href: i.href, label: i.rotulo })));

const SUB_ITENS_CONFIGURACOES: SubItemNav[] = GRUPOS_CONFIGURACOES.flatMap((g) => g.itens.map((i) => ({ href: i.href, label: i.rotulo })));

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

  // No desktop o grupo some quando o painel fecha (vira flyout à parte, ver
  // renderLista) — abrir já com um grupo pré-selecionado plantaria um
  // flyout fantasma antes de qualquer clique. No Sheet mobile o grupo troca
  // a tela inteira (padrão drill-down), então continua fazendo sentido abrir
  // direto na seção da rota atual.
  const [grupoAberto, setGrupoAberto] = useState<string | null>(() => (emSheet ? grupoPelaRota(pathname) : null));
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

  // Clique num destino de navegação (item de nível superior, favorito, ou
  // subitem do flyout) fecha o painel na hora — antes só fechava quando o
  // mouse saísse da área, o que deixava a sidebar aberta "pairando" por
  // cima do conteúdo até o usuário mexer o mouse de novo (achado em
  // feedback do usuário, 04/09/2026).
  function fecharPainel() {
    limparTimers();
    setAberta(false);
    setGrupoAberto(null);
  }

  function agendarAbrir() {
    limparTimers();
    timerAbrir.current = setTimeout(() => setAberta(true), 100);
  }

  function agendarFechar() {
    limparTimers();
    timerFechar.current = setTimeout(() => {
      // Com um flyout aberto, não fecha por hover-timing nenhum — só um
      // clique explícito (num link, fora, ou no próprio trigger de novo)
      // ou Escape encerram. Tentar coordenar isso via onMouseEnter/
      // onMouseLeave no PopoverContent (o flyout vive num Portal, fora da
      // árvore DOM deste wrapper) tinha uma corrida real: o cursor cruza
      // um vão de ~12px (sideOffset) entre o botão e o flyout sem estar
      // "dentro" de nenhum dos dois por um instante — se o timer de 250ms
      // disparasse nesse meio-tempo, fechava painel E flyout debaixo do
      // clique que o usuário ainda estava fazendo (achado em uso real,
      // 04/09/2026: clique num submódulo não navegava pra lugar nenhum).
      if (grupoAberto) return;
      setAberta(false);
    }, 250);
  }

  function aoFocar() {
    limparTimers();
    setAberta(true);
  }

  function aoPerderFoco(e: React.FocusEvent<HTMLDivElement>) {
    // Mesmo motivo do guard em agendarFechar: o flyout vive num Portal,
    // fora da árvore DOM deste wrapper — navegar por Tab até um link lá
    // dentro conta como "perdeu o foco" daqui, mesmo estando logicamente
    // dentro do mesmo menu.
    if (!e.currentTarget.contains(e.relatedTarget as Node) && !grupoAberto) {
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
    // Só o Sheet mobile troca a tela inteira pelo grupo (drill-down, sem
    // espaço pra flyout). No desktop cada grupo abre seu próprio flyout ao
    // lado (ver abaixo) — a lista de nível superior nunca é substituída.
    if (emSheet && itemDoGrupo?.subItens) {
      return (
        <nav className="scroll-fino flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          <button
            type="button"
            onClick={() => setGrupoAberto(null)}
            className="mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
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
                    "flex-1 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                    ativo ? "bg-muted text-foreground" : "text-foreground/75 hover:bg-muted hover:text-foreground",
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
      <nav className="scroll-fino flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {itensFavoritados.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="px-2.5 text-[10px] font-bold uppercase tracking-wide text-foreground/60">
              Favoritos
            </span>
            {itensFavoritados.map((fav) => {
              const ativo = pathname === fav.href;
              return (
                <div key={fav.href} className="group/item flex items-center gap-1">
                  <Link
                    href={fav.href}
                    onClick={emSheet ? undefined : fecharPainel}
                    className={cn(
                      "flex-1 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                      ativo ? "bg-muted text-foreground" : "text-foreground/75 hover:bg-muted hover:text-foreground",
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
                    <Icon size={19} weight="bold" />
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                      em breve
                    </span>
                  </div>
                );
              }

              if (item.subItens) {
                const botao = (
                  <button
                    type="button"
                    onClick={emSheet ? () => setGrupoAberto(item.href) : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                      ativo ? "bg-muted text-foreground" : "text-foreground/75 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon size={19} weight="bold" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <CaretRight size={13} />
                  </button>
                );

                if (emSheet) {
                  return (
                    <div key={item.href}>{botao}</div>
                  );
                }

                // Desktop: cada grupo abre um flyout do próprio tamanho ao
                // lado, em vez de substituir a lista inteira pelo painel
                // 100vh do grupo — Comercial (3 itens) e Relatórios (~9)
                // deixavam de sobrar espaço vazio ou de comprimir a lista,
                // igual ao padrão observado na Conta Azul (achado em
                // feedback do usuário, 03/09/2026).
                return (
                  <Popover
                    key={item.href}
                    open={grupoAberto === item.href}
                    onOpenChange={(open) => setGrupoAberto(open ? item.href : null)}
                  >
                    <PopoverTrigger asChild>{botao}</PopoverTrigger>
                    <PopoverContent
                      side="right"
                      align="start"
                      sideOffset={12}
                      collisionPadding={12}
                      className="scroll-fino w-56 max-h-[var(--radix-popover-content-available-height)] flex-col gap-0.5 overflow-y-auto p-2"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                      // Ao fechar (grupoAberto vira null pelo clique num
                      // subitem), o Radix por padrão devolve o foco pro
                      // botão-gatilho ("Comercial" etc) — que está dentro da
                      // área com onFocus={aoFocar}, reabrindo o painel um
                      // instante depois de fecharPainel() tê-lo fechado
                      // (achado em uso real, 04/09/2026: clique em Vendas
                      // navegava mas o painel voltava a aparecer expandido).
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      <p className="sticky top-0 z-10 mb-1 border-b border-border bg-popover px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground/80">
                        {item.label}
                      </p>
                      {item.subItens.map((sub) => {
                        const subAtivo = pathname === sub.href;
                        const subFavoritado = favoritos.includes(sub.href);
                        return (
                          <div key={sub.href} className="group/item flex items-center gap-1">
                            <Link
                              href={sub.href}
                              onClick={fecharPainel}
                              className={cn(
                                "flex-1 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                                subAtivo ? "bg-muted text-foreground" : "text-foreground/75 hover:bg-muted hover:text-foreground",
                              )}
                            >
                              {sub.label}
                            </Link>
                            <BotaoEstrela ativo={subFavoritado} onToggle={() => alternarFavorito(sub.href, sub.label)} />
                          </div>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                );
              }

              return (
                <div key={item.href} className="group/item flex items-center gap-1">
                  <Link
                    href={item.href}
                    onClick={emSheet ? undefined : fecharPainel}
                    className={cn(
                      "flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                      ativo ? "bg-muted text-foreground" : "text-foreground/75 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon size={19} weight="bold" />
                    {item.label}
                  </Link>
                  <BotaoEstrela ativo={favoritado} onToggle={() => alternarFavorito(item.href, item.label)} />
                </div>
              );
            })();

            return (
              <div key={item.href}>
                {mostrarCabecalho && (
                  <span className="mt-3 mb-1 block px-2.5 text-[10px] font-bold uppercase tracking-wide text-foreground/60">
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
        <div className="flex shrink-0 items-center gap-2 px-2">
          <img src="/logo/icone-claro.png" alt="" className="size-8 shrink-0 object-contain dark:hidden" />
          <img src="/logo/icone-escuro.png" alt="" className="hidden size-8 shrink-0 object-contain dark:block" />
          <img src="/logo/texto-claro.png" alt="Finanssi" className="h-7 w-auto dark:hidden" />
          <img src="/logo/texto-escuro.png" alt="Finanssi" className="hidden h-7 w-auto dark:block" />
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
                  <Icon size={20} weight="bold" />
                </div>
              );
            }

            if (item.subItens) {
              return (
                <button
                  key={item.href}
                  type="button"
                  title={item.label}
                  onClick={() => {
                    // Só abre o painel (igual ao hover) — NÃO pré-seleciona
                    // o grupo aqui. Fazer isso mudava o `open` do Popover
                    // do grupo a partir de um clique que, pro Radix, não
                    // veio do próprio trigger dele — a checagem de "clique
                    // fora" do Popover fechava o flyout no mesmo instante
                    // em que abria (achado em uso real, 03/09/2026: clicar
                    // no ícone não abria nada). O clique na própria linha
                    // do painel (o PopoverTrigger de verdade) continua
                    // funcionando normalmente.
                    limparTimers();
                    setAberta(true);
                  }}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    ativo ? "bg-muted text-foreground" : "text-foreground/75 hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="sr-only">{item.label}</span>
                  <Icon size={20} weight="bold" />
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                  ativo ? "bg-muted text-foreground" : "text-foreground/75 hover:bg-muted hover:text-foreground",
                )}
              >
                <span className="sr-only">{item.label}</span>
                <Icon size={20} weight="bold" />
              </Link>
            );
          })}
        </div>

        {/* Overlay: cobre o rail (volta a ser uma coluna só, sem o rail de
            ícones ficando visível do lado — achado em feedback do usuário,
            03/09/2026). O ícone do rail não seleciona mais grupo nenhum no
            clique (só abre o painel, igual ao hover), então não corre mais
            risco de o clique cair numa linha errada do painel por baixo. */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-[260px] border-r border-border shadow-2xl transition-[opacity,transform] duration-150",
            aberta ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none -translate-x-2 opacity-0",
          )}
        >
          <div className="flex h-full min-h-0 flex-col gap-6 bg-card px-4 py-6 text-foreground">
            <div className="flex shrink-0 items-center gap-2 px-2">
              <img src="/logo/icone-claro.png" alt="" className="size-8 shrink-0 object-contain dark:hidden" />
              <img src="/logo/icone-escuro.png" alt="" className="hidden size-8 shrink-0 object-contain dark:block" />
              <img src="/logo/texto-claro.png" alt="Finanssi" className="h-7 w-auto dark:hidden" />
              <img src="/logo/texto-escuro.png" alt="Finanssi" className="hidden h-7 w-auto dark:block" />
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
