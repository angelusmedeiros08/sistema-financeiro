"use client";

import { RadialBar, RadialBarChart } from "recharts";
import { formatarMesAbreviado, formatarPercentual } from "@/lib/formatacao";
import { Sparkline } from "@/components/painel/sparkline";

// Arco + rótulo + mini-tendência lado a lado numa única linha — a mesma
// composição do card "arc-progress" que o usuário mandou de referência
// (anel à esquerda, texto no meio, gráfico de tendência com eixo à
// direita), não peças empilhadas verticalmente feito bloco solto em cima
// de outro. Precisa de card mais largo pra caber (ver grid-cols-2 nas
// páginas que usam isso, não grid-cols-4).
const ZONAS_PADRAO = [
  { ate: 0.4, cor: "#B23A2E" },
  { ate: 0.7, cor: "#E3A62F" },
  { ate: 1, cor: "#0FA37E" },
] as const;

const ZONAS_INVERTIDAS = [
  { ate: 0.3, cor: "#0FA37E" },
  { ate: 0.65, cor: "#E3A62F" },
  { ate: 1, cor: "#B23A2E" },
] as const;

function corDaZona(valor: number, invertido: boolean): string {
  const zonas = invertido ? ZONAS_INVERTIDAS : ZONAS_PADRAO;
  return (zonas.find((z) => valor <= z.ate) ?? zonas[zonas.length - 1]).cor;
}

export type PontoSerieGauge = { mes: string; valor: number };

export function IndicadorGauge({
  rotulo,
  valor,
  invertido = false,
  serie,
}: {
  rotulo: string;
  valor: number;
  invertido?: boolean;
  serie?: PontoSerieGauge[];
}) {
  const percentualClamp = Math.max(0, Math.min(1, valor));
  const cor = corDaZona(percentualClamp, invertido);
  const temSerie = serie && serie.length > 1;
  const dadosAnel = [{ valor: percentualClamp * 100, fill: cor }];

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card">
      {/* Donut grosso (traço ~40% do raio) igual à referência Taskcore —
          nada de anel fino tipo "gauge de carro". innerRadius em % (sem
          barSize) deixa o traço proporcional ao tamanho do anel. */}
      <div className="relative flex size-[88px] shrink-0 items-center justify-center">
        <RadialBarChart
          width={88}
          height={88}
          cx="50%"
          cy="50%"
          innerRadius="58%"
          outerRadius="100%"
          data={dadosAnel}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            background={{ fill: "var(--muted)" }}
            dataKey="valor"
            cornerRadius={99}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          />
        </RadialBarChart>
        <span className="pointer-events-none absolute text-sm font-bold tabular-nums text-foreground">
          {formatarPercentual(percentualClamp)}
        </span>
      </div>

      <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">{rotulo}</span>

      {temSerie && (
        <div className="hidden w-28 shrink-0 sm:block">
          <div className="h-10">
            <Sparkline dados={serie.map((p) => p.valor)} cor={cor} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-medium text-muted-foreground">
            <span>{formatarMesAbreviado(serie[0].mes)}</span>
            <span>{formatarMesAbreviado(serie[serie.length - 1].mes)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
