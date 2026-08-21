"use client";

import { RadialBar, RadialBarChart } from "recharts";
import { formatarPercentual } from "@/lib/formatacao";
import { Sparkline } from "@/components/painel/sparkline";

// Anel completo via Recharts RadialBarChart (não semicírculo desenhado à
// mão) — o formato de gauge que aparece em praticamente toda referência
// comercial mandada pelo usuário, com a mini-tendência dos últimos
// períodos ao lado, não o indicador isolado sem contexto de evolução.
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

export function IndicadorGauge({
  rotulo,
  valor,
  invertido = false,
  serie,
}: {
  rotulo: string;
  valor: number;
  invertido?: boolean;
  serie?: number[];
}) {
  const percentualClamp = Math.max(0, Math.min(1, valor));
  const cor = corDaZona(percentualClamp, invertido);
  const temSerie = serie && serie.length > 1;
  const dadosAnel = [{ valor: percentualClamp * 100, fill: cor }];

  return (
    <div className="flex flex-col gap-3 rounded-2xl p-4 shadow-card" style={{ background: `color-mix(in srgb, ${cor} 8%, var(--card))` }}>
      <span className="text-xs font-semibold text-muted-foreground">{rotulo}</span>

      {/* Anel de 96px com furo interno de ~71px — texto tipo "100,0%" em
          18px bold cabe com folga; em 64px o furo (≈39px) era menor que o
          próprio texto e os dígitos vazavam por cima do traço colorido. */}
      <div className="relative mx-auto flex size-24 shrink-0 items-center justify-center">
        <RadialBarChart
          width={96}
          height={96}
          cx="50%"
          cy="50%"
          innerRadius="74%"
          outerRadius="100%"
          barSize={9}
          data={dadosAnel}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            background={{ fill: "var(--muted)" }}
            dataKey="valor"
            cornerRadius={8}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          />
        </RadialBarChart>
        <span className="pointer-events-none absolute text-lg font-bold tabular-nums text-foreground">
          {formatarPercentual(percentualClamp)}
        </span>
      </div>

      {temSerie && (
        <div className="-mx-1 h-7">
          <Sparkline dados={serie} cor={cor} />
        </div>
      )}
    </div>
  );
}
