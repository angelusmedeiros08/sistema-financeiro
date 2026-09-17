"use client";

import { useEffect, useState } from "react";
import { ChartLineUp, Coins, CreditCard, HandCoins, Receipt, SquaresFour } from "@phosphor-icons/react";

// Carrossel comercial do AuthShell: 3 telas do próprio sistema, recriadas com
// a gramática visual real (mesmos ícones de navegação do sidebar.tsx, mesmos
// tokens de cor) — não é screenshot de tenant real (dado real não pode ir
// numa página pública) nem foto de banco de imagem (já testado e rejeitado).
// Cada tela vem com uma frase comercial, igual às três linhas de destaque já
// usadas na landing page.
type Slide = {
  titulo: string;
  texto: string;
  Tela: () => React.JSX.Element;
};

function MiniSidebar({ ativo }: { ativo: "painel" | "relatorios" | "chat" }) {
  const itens = [
    { id: "painel", Icone: SquaresFour },
    { id: "receitas", Icone: Coins },
    { id: "despesas", Icone: Receipt },
    { id: "receber", Icone: HandCoins },
    { id: "pagar", Icone: CreditCard },
    { id: "relatorios", Icone: ChartLineUp },
  ] as const;

  return (
    <div className="flex w-11 shrink-0 flex-col items-center gap-2 border-r border-border bg-muted/40 py-3">
      {itens.map(({ id, Icone }) => (
        <span
          key={id}
          className={`flex size-7 items-center justify-center rounded-lg ${
            id === ativo ? "bg-primary text-primary-foreground" : "text-muted-foreground/60"
          }`}
        >
          <Icone className="size-4" weight={id === ativo ? "fill" : "regular"} />
        </span>
      ))}
    </div>
  );
}

function TopoTela({ titulo }: { titulo: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
      <p className="text-xs font-semibold text-foreground">{titulo}</p>
      <span className="flex gap-1">
        <span className="size-1.5 rounded-full bg-border" />
        <span className="size-1.5 rounded-full bg-border" />
        <span className="size-1.5 rounded-full bg-border" />
      </span>
    </div>
  );
}

function TelaPainel() {
  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-border bg-card">
      <MiniSidebar ativo="painel" />
      <div className="flex-1">
        <TopoTela titulo="Painel" />
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Saldo em caixa</p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums text-foreground">R$ 84.210,55</p>
          <div className="mt-4 flex items-end gap-1.5">
            {[30, 46, 38, 55, 50, 64, 58, 72, 66, 80].map((altura, i) => (
              <div key={i} className="flex-1 rounded-t bg-primary/70" style={{ height: `${altura * 0.7}px` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TelaRelatorios() {
  const pontos = [24, 30, 22, 38, 34, 46, 40, 52, 48, 60];
  const largura = 220;
  const altura = 70;
  const passo = largura / (pontos.length - 1);
  const max = Math.max(...pontos);
  const linha = pontos.map((v, i) => `${i * passo},${altura - (v / max) * altura}`).join(" ");

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-border bg-card">
      <MiniSidebar ativo="relatorios" />
      <div className="flex-1">
        <TopoTela titulo="Relatórios · DRE" />
        <div className="p-4">
          <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full" preserveAspectRatio="none" aria-hidden>
            <polyline points={linha} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
            <div>
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Receita</p>
              <p className="font-heading text-xs font-bold tabular-nums text-foreground">R$ 68,2k</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Despesa</p>
              <p className="font-heading text-xs font-bold tabular-nums text-foreground">R$ 41,7k</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Resultado</p>
              <p className="font-heading text-xs font-bold tabular-nums text-positivo-foreground">R$ 26,5k</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TelaChatIA() {
  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-border bg-card">
      <MiniSidebar ativo="chat" />
      <div className="flex-1">
        <TopoTela titulo="Chat IA" />
        <div className="flex flex-col gap-2 p-4">
          <div className="flex justify-end">
            <p className="max-w-[75%] rounded-xl rounded-br-sm bg-muted px-3 py-1.5 text-[11px] text-foreground">Quanto entrou em março?</p>
          </div>
          <div className="flex justify-start">
            <p className="max-w-[85%] rounded-xl rounded-bl-sm bg-primary/10 px-3 py-2 text-[11px] leading-relaxed text-foreground">
              Março fechou com <span className="font-semibold text-primary">R$ 42.300,00</span> em receitas, 12% a mais que fevereiro.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const SLIDES: Slide[] = [
  {
    titulo: "Todo o financeiro, num painel só",
    texto: "Saldo em caixa, contas a pagar e a receber, sempre atualizados — sem planilha auxiliar.",
    Tela: TelaPainel,
  },
  {
    titulo: "Relatório que fecha sozinho",
    texto: "DRE, DFC e indicadores calculados direto do que já foi lançado no sistema.",
    Tela: TelaRelatorios,
  },
  {
    titulo: "Pergunte, em vez de procurar",
    texto: "O Chat IA responde com o número de verdade por trás, na hora.",
    Tela: TelaChatIA,
  },
];

export function CarrosselAuth() {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => setIndice((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <div className="relative aspect-[4/3] w-full">
        {SLIDES.map(({ Tela }, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i === indice ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            <Tela />
          </div>
        ))}
      </div>

      <div className="text-center">
        <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">{SLIDES[indice].titulo}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{SLIDES[indice].texto}</p>
      </div>

      <div className="flex justify-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndice(i)}
            aria-label={`Ver tela ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === indice ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
          />
        ))}
      </div>
    </div>
  );
}
