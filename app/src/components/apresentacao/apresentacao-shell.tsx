"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaretLeft, CaretRight, X, Play, Pause, ArrowsOut, ArrowsIn } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { obterApresentacaoParaSessao } from "@/lib/apresentacao/sessao-actions";
import { montarUrlSlide, PARAM_SLIDE, PARAM_MODO, PARAM_PAUSADO, type ModoApresentacao } from "@/lib/apresentacao/sessao";
import type { ApresentacaoComSlides } from "@/lib/apresentacao/apresentacoes";

// Renderiza a sessão de apresentação em andamento — spec Seção 6/7. `children`
// é a página real do slide atual (Painel, Indicadores, um Relatório), a
// mesma que renderiza fora do modo apresentação, sem nenhuma cópia paralela.
// Este componente só sobrepõe os controles de navegação/pausa; quem decide
// SE ele entra em cena é o AppChromeShell, no (app)/layout.tsx.
export function ApresentacaoShell({ apresentacaoId, children }: { apresentacaoId: string; children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [apresentacao, setApresentacao] = useState<ApresentacaoComSlides | null | undefined>(undefined);

  const modo = (searchParams.get(PARAM_MODO) === "tv" ? "tv" : "apresentador") as ModoApresentacao;
  const pausado = searchParams.get(PARAM_PAUSADO) === "1";
  // Number("abc") ou parâmetro ausente/corrompido vira NaN — sem o fallback,
  // NaN se propagava até slides[NaN] (undefined) e quebrava a próxima
  // navegação com TypeError (achado em revisão de código).
  const indiceBrutoLido = Number(searchParams.get(PARAM_SLIDE) ?? "0");
  const indiceBruto = Number.isFinite(indiceBrutoLido) ? indiceBrutoLido : 0;

  // Busca os slides a cada troca de slide, não só uma vez por sessão — spec
  // Seção 8 promete que excluir a apresentação em outra aba faz a "próxima
  // navegação falhar... cai pra /apresentacoes com aviso"; buscar só no mount
  // (chave só em apresentacaoId, que nunca muda durante a sessão) nunca
  // detectava isso, deixando o Modo TV ciclando por dado já apagado
  // indefinidamente (achado em revisão de código). Layouts não recebem
  // searchParams, então essa leitura só pode acontecer aqui, num Client
  // Component, via server action (lib/apresentacao/sessao-actions.ts).
  useEffect(() => {
    let cancelado = false;
    obterApresentacaoParaSessao(apresentacaoId).then((resultado) => {
      if (!cancelado) setApresentacao(resultado);
    });
    return () => {
      cancelado = true;
    };
  }, [apresentacaoId, indiceBruto]);

  // useSyncExternalStore em vez de useEffect+setState — é o jeito correto de
  // sincronizar com uma API externa do navegador (evita o anti-padrão de
  // setState direto no corpo do efeito, e como bônus reage se o usuário
  // mudar a preferência de sistema com a apresentação já aberta).
  const reducedMotion = useSyncExternalStore(
    (aoMudar) => {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      mql.addEventListener("change", aoMudar);
      return () => mql.removeEventListener("change", aoMudar);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const slides = useMemo(() => apresentacao?.slides ?? [], [apresentacao]);
  const total = slides.length;
  const indiceAtual = total > 0 ? Math.min(Math.max(indiceBruto, 0), total - 1) : 0;

  // useTransition em volta do router.push — sem isso, um clique em
  // "Próximo" ficava sem nenhum feedback visual até a página nova terminar
  // de carregar no servidor (a rota do slide seguinte nunca tinha sido
  // visitada antes, então não tem nada em cache local), o que parecia
  // travado/lento (achado direto do usuário). `navegando` liga a barra de
  // progresso abaixo assim que o clique acontece, não só quando o Modo TV
  // troca sozinho.
  const [navegando, iniciarNavegacao] = useTransition();

  const irPara = useCallback(
    (indice: number, opts?: { pausado?: boolean }) => {
      if (total === 0) return;
      const alvo = ((indice % total) + total) % total;
      const url = montarUrlSlide(slides[alvo].rota, { apresentacaoId, indice: alvo, modo, pausado: opts?.pausado ?? pausado });
      iniciarNavegacao(() => {
        router.push(url);
      });
    },
    [router, slides, total, apresentacaoId, modo, pausado],
  );

  // Pré-busca o baralho inteiro assim que os slides são conhecidos — só o
  // vizinho imediato (achado do usuário: troca lenta, "devia ser instantâneo
  // que nem no Canva") deixava qualquer avanço além dele batendo numa rota
  // nunca visitada, round-trip de RSC completo. Roda uma vez por sessão (a
  // troca de slide em si não entra nas dependências), não fica refazendo a
  // cada navegação.
  useEffect(() => {
    slides.forEach((slide, indice) => {
      router.prefetch(montarUrlSlide(slide.rota, { apresentacaoId, indice, modo, pausado }));
    });
  }, [slides, apresentacaoId, modo, pausado, router]);

  const emTelaCheia = useSyncExternalStore(
    (aoMudar) => {
      document.addEventListener("fullscreenchange", aoMudar);
      return () => document.removeEventListener("fullscreenchange", aoMudar);
    },
    () => document.fullscreenElement !== null,
    () => false,
  );

  function alternarTelaCheia() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  // Tenta entrar em tela cheia de verdade assim que a sessão monta — o
  // usuário pediu que o foco fosse o gráfico/relatório em tela cheia, não só
  // sem Sidebar/Topbar. Só funciona se o navegador ainda considerar o clique
  // em "Apresentar"/"Modo TV" (que trouxe até aqui) um gesto do usuário
  // recente — silenciosamente não faz nada se não for o caso; por isso o
  // botão manual (alternarTelaCheia) sempre fica disponível como garantia.
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const sair = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    router.push("/apresentacoes");
  }, [router]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      // O slide é a página real, com seus próprios filtros (ex.: campo de
      // data dos relatórios) — sem essa checagem, seta-esquerda pra mover o
      // cursor dentro de um <input type="date"> ou Esc pra fechar um
      // Popover/Select da própria tela também navegava/saía da apresentação
      // (achado em revisão de código). `data-radix-popper-content-wrapper`
      // cobre Popover/Select/DropdownMenu — todos os primitivos do Radix
      // baseados em Popper usados no resto do sistema.
      const alvo = e.target;
      if (
        alvo instanceof HTMLElement &&
        alvo.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], [data-radix-popper-content-wrapper]")
      ) {
        return;
      }
      if (e.key === "Escape") sair();
      if (e.key === "ArrowRight") irPara(indiceAtual + 1);
      if (e.key === "ArrowLeft") irPara(indiceAtual - 1);
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [irPara, sair, indiceAtual]);

  // WCAG 2.2.2: conteúdo que avança sozinho por mais de 5s precisa de
  // pausar/parar. `prefers-reduced-motion` desarma o timer por completo (não
  // só oferece pausa) — cai pro comportamento manual, com aviso.
  const avancoAutomaticoAtivo =
    modo === "tv" && !pausado && !reducedMotion && total > 1 && (apresentacao?.permiteModoTv ?? true);
  const intervaloMs = (apresentacao?.intervaloSegundos ?? 20) * 1000;

  useEffect(() => {
    if (!avancoAutomaticoAtivo) return;
    const timer = setTimeout(() => irPara(indiceAtual + 1), intervaloMs);
    return () => clearTimeout(timer);
  }, [avancoAutomaticoAtivo, intervaloMs, indiceAtual, irPara]);

  if (apresentacao === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-8 text-center">
        <p className="text-foreground">Essa apresentação não existe mais ou você não tem acesso a ela.</p>
        <button onClick={sair} className="text-sm text-primary underline">
          Voltar pra Apresentação
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {navegando && (
        <div className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-primary/20">
          <div className="h-full w-1/3 animate-[apresentacao-carregando_0.8s_ease-in-out_infinite] bg-primary" />
        </div>
      )}

      {modo === "tv" && reducedMotion && (
        <div className="bg-amber-500/90 px-4 py-2 text-center text-xs text-black">
          Avanço automático desativado nas suas preferências de sistema — use as setas ou o botão Retomar.
        </div>
      )}

      <div className={cn("flex-1 overflow-auto p-4 pb-16 lg:p-8 lg:pb-16", navegando && "opacity-60 transition-opacity")}>{children}</div>

      {/* Botões com p-3.5 (14px) em volta de ícones de 16px = 44px de área
          de toque — antes eram só os 16px do ícone, achado testando em
          mobile (a barra inteira cabia sem problema, mas os alvos de toque
          eram pequenos demais pra WCAG/mobile-first). */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between bg-black/80 pl-1.5 text-white backdrop-blur">
        <button onClick={sair} aria-label="Sair da apresentação" className="flex items-center gap-1.5 p-3.5 text-sm hover:opacity-80">
          <X size={16} />
          Sair
        </button>

        {total > 0 && (
          <div className="flex items-center">
            {modo === "tv" && !reducedMotion && (apresentacao?.permiteModoTv ?? true) && (
              <button
                onClick={() => irPara(indiceAtual, { pausado: !pausado })}
                aria-label={pausado ? "Retomar avanço automático" : "Pausar avanço automático"}
                className="p-3.5 hover:opacity-80"
              >
                {pausado ? <Play size={16} /> : <Pause size={16} />}
              </button>
            )}
            <button onClick={() => irPara(indiceAtual - 1)} aria-label="Slide anterior" className="p-3.5 hover:opacity-80">
              <CaretLeft size={16} />
            </button>
            <span className="px-1 text-xs tabular-nums text-white/80">
              {indiceAtual + 1} de {total}
            </span>
            <button onClick={() => irPara(indiceAtual + 1)} aria-label="Próximo slide" className="p-3.5 hover:opacity-80">
              <CaretRight size={16} />
            </button>
            <button
              onClick={alternarTelaCheia}
              aria-label={emTelaCheia ? "Sair da tela cheia" : "Entrar em tela cheia"}
              className="p-3.5 hover:opacity-80"
            >
              {emTelaCheia ? <ArrowsIn size={16} /> : <ArrowsOut size={16} />}
            </button>
          </div>
        )}
      </div>

      {avancoAutomaticoAtivo && (
        <div key={indiceAtual} className="fixed inset-x-0 bottom-11 z-50 h-0.5 bg-white/20">
          <div className="h-full bg-primary" style={{ animation: `apresentacao-progresso ${intervaloMs}ms linear forwards` }} />
        </div>
      )}

      <style>{`
        @keyframes apresentacao-progresso {
          from { width: 0% }
          to { width: 100% }
        }
        @keyframes apresentacao-carregando {
          from { transform: translateX(-100%) }
          to { transform: translateX(300%) }
        }
      `}</style>
    </div>
  );
}
