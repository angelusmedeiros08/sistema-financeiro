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
    <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card">
      <div className="relative flex size-16 shrink-0 items-center justify-center">
        <RadialBarChart
          width={64}
          height={64}
          cx="50%"
          cy="50%"
          innerRadius="72%"
          outerRadius="100%"
          barSize={7}
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
        <span className="pointer-events-none absolute text-[13px] font-bold tabular-nums text-foreground">
          {formatarPercentual(percentualClamp)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-muted-foreground">{rotulo}</span>
        {temSerie && (
          <div className="-mx-1 mt-1.5 h-6">
            <Sparkline dados={serie} cor={cor} />
          </div>
        )}
      </div>
    </div>
  );
}
