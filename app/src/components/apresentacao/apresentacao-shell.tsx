"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaretLeft, CaretRight, X, Play, Pause } from "@phosphor-icons/react";
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
  const indiceBruto = Number(searchParams.get(PARAM_SLIDE) ?? "0");

  // Busca os slides uma vez por sessão (a lista não muda enquanto a
  // apresentação está sendo vista) — layouts não recebem searchParams, então
  // essa leitura só pode acontecer aqui, num Client Component, via server
  // action (lib/apresentacao/sessao-actions.ts).
  useEffect(() => {
    let cancelado = false;
    obterApresentacaoParaSessao(apresentacaoId).then((resultado) => {
      if (!cancelado) setApresentacao(resultado);
    });
    return () => {
      cancelado = true;
    };
  }, [apresentacaoId]);

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

  const irPara = useCallback(
    (indice: number, opts?: { pausado?: boolean }) => {
      if (total === 0) return;
      const alvo = ((indice % total) + total) % total;
      router.push(
        montarUrlSlide(slides[alvo].rota, { apresentacaoId, indice: alvo, modo, pausado: opts?.pausado ?? pausado }),
      );
    },
    [router, slides, total, apresentacaoId, modo, pausado],
  );

  const sair = useCallback(() => router.push("/apresentacoes"), [router]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
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
  const avancoAutomaticoAtivo = modo === "tv" && !pausado && !reducedMotion && total > 1;
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
      {modo === "tv" && reducedMotion && (
        <div className="bg-amber-500/90 px-4 py-2 text-center text-xs text-black">
          Avanço automático desativado nas suas preferências de sistema — use as setas ou o botão Retomar.
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 pb-16 lg:p-8 lg:pb-16">{children}</div>

      <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 bg-black/80 px-4 py-2.5 text-white backdrop-blur">
        <button onClick={sair} aria-label="Sair da apresentação" className="flex items-center gap-1.5 text-sm hover:opacity-80">
          <X size={16} />
          Sair
        </button>

        {total > 0 && (
          <div className="flex items-center gap-3">
            {modo === "tv" && !reducedMotion && (
              <button
                onClick={() => irPara(indiceAtual, { pausado: !pausado })}
                aria-label={pausado ? "Retomar avanço automático" : "Pausar avanço automático"}
                className="hover:opacity-80"
              >
                {pausado ? <Play size={16} /> : <Pause size={16} />}
              </button>
            )}
            <button onClick={() => irPara(indiceAtual - 1)} aria-label="Slide anterior" className="hover:opacity-80">
              <CaretLeft size={16} />
            </button>
            <span className="text-xs tabular-nums text-white/80">
              {indiceAtual + 1} de {total}
            </span>
            <button onClick={() => irPara(indiceAtual + 1)} aria-label="Próximo slide" className="hover:opacity-80">
              <CaretRight size={16} />
            </button>
          </div>
        )}
      </div>

      {avancoAutomaticoAtivo && (
        <div key={indiceAtual} className="fixed inset-x-0 bottom-[42px] z-50 h-0.5 bg-white/20">
          <div className="h-full bg-primary" style={{ animation: `apresentacao-progresso ${intervaloMs}ms linear forwards` }} />
        </div>
      )}

      <style>{`
        @keyframes apresentacao-progresso {
          from { width: 0% }
          to { width: 100% }
        }
      `}</style>
    </div>
  );
}
