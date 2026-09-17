"use client";

import { useEffect, useState } from "react";
import { Check, ChartLineUp, ChatCircleDots, FileMagnifyingGlass } from "@phosphor-icons/react/dist/ssr";

// Slides gerados com a gramática visual do próprio produto (mesmos tokens
// de cor, tabular-nums) em vez de foto de banco de imagem — banco de
// imagem cortava gente/gráfico de forma estranha dentro do object-cover
// de uma coluna estreita e alta. Aqui é SVG/CSS, sempre bem enquadrado.
const SLIDES = [
  {
    Visual: SlideBarras,
    icone: ChartLineUp,
    titulo: "Relatório que fecha sozinho",
    legenda: "DRE, DFC e indicadores calculados a partir do que já foi lançado.",
    selo: "Todos os relatórios inclusos",
  },
  {
    Visual: SlideLinha,
    icone: FileMagnifyingGlass,
    titulo: "A IA lê o documento, você só confirma",
    legenda: "Extrato, recibo ou nota fiscal viram lançamento sem digitação manual.",
    selo: "Importação com IA inclusa",
  },
  {
    Visual: SlideAnel,
    icone: ChatCircleDots,
    titulo: "Pergunte, em vez de procurar",
    legenda: "O Chat IA responde sobre suas finanças com o número de verdade por trás.",
    selo: "Chat IA incluso",
  },
];

const INTERVALO_MS = 6000;

export function CarrosselAuth() {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndice((i) => (i + 1) % SLIDES.length), INTERVALO_MS);
    return () => clearInterval(id);
  }, []);

  const slideAtual = SLIDES[indice];

  return (
    <div className="relative hidden h-full w-full flex-col overflow-hidden bg-foreground lg:flex">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full bg-primary opacity-[0.14] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-24 size-[24rem] rounded-full bg-positivo opacity-[0.12] blur-3xl"
      />

      <div className="relative flex items-center justify-between px-10 pt-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80">
          <Check className="size-3.5 text-positivo" weight="bold" />
          Cartão salvo agora, cobrança só depois do trial
        </span>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-14">
        {SLIDES.map(({ Visual, icone: Icone, selo }, i) => (
          <div key={i} className={`absolute flex items-center justify-center transition-opacity duration-700 ease-in-out ${i === indice ? "opacity-100" : "opacity-0"}`}>
            <div className="relative pb-8 pr-8">
              <Visual />
              <div className="absolute -bottom-2 -right-2 flex items-center gap-2 rounded-xl border border-white/10 bg-[#1b2321] px-4 py-3 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.6)]">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/20">
                  <Icone className="size-3.5 text-primary" weight="bold" />
                </span>
                <span className="text-xs font-semibold text-white">{selo}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative p-10">
        <p className="font-heading text-2xl font-bold leading-snug text-white">{slideAtual.titulo}</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/60">{slideAtual.legenda}</p>

        <div className="mt-6 flex gap-2">
          {SLIDES.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === indice ? "w-6 bg-white" : "w-1.5 bg-white/30"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideBarras() {
  const barras = [42, 58, 50, 68, 62, 78, 72, 88];
  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Receita, últimos 8 meses</p>
      <div className="mt-6 flex h-40 items-end gap-2.5">
        {barras.map((altura, i) => (
          <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary to-primary/60" style={{ height: `${altura}%` }} />
        ))}
      </div>
      <div className="mt-5 flex items-baseline justify-between border-t border-white/10 pt-4">
        <span className="text-xs text-white/50">Este mês</span>
        <span className="font-heading text-xl font-bold tabular-nums text-white">R$ 88.200</span>
      </div>
    </div>
  );
}

function SlideLinha() {
  const pontos = [30, 38, 34, 46, 42, 55, 50, 64, 60, 74];
  const largura = 280;
  const altura = 100;
  const passo = largura / (pontos.length - 1);
  const max = Math.max(...pontos);
  const linha = pontos.map((v, i) => `${i * passo},${altura - (v / max) * altura}`).join(" ");
  const area = `0,${altura} ${linha} ${largura},${altura}`;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Saldo em caixa</p>
      <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-white">R$ 74.320,00</p>
      <svg viewBox={`0 0 ${largura} ${altura}`} className="mt-4 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaCarrossel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--positivo)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--positivo)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#areaCarrossel)" />
        <polyline points={linha} fill="none" stroke="var(--positivo)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-4 text-xs font-semibold text-positivo">
        <span>▲ 12,4%</span>
        <span className="font-normal text-white/50">vs. mês anterior</span>
      </div>
    </div>
  );
}

function SlideAnel() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Margem líquida</p>
      <div className="relative mt-6 flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="size-40 -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="12"
            strokeDasharray={2 * Math.PI * 50}
            strokeDashoffset={2 * Math.PI * 50 * (1 - 0.32)}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute font-heading text-3xl font-extrabold tabular-nums text-white">32%</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/50">Receita</p>
          <p className="text-sm font-bold tabular-nums text-white">R$ 88,2k</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/50">Lucro</p>
          <p className="text-sm font-bold tabular-nums text-white">R$ 28,2k</p>
        </div>
      </div>
    </div>
  );
}
