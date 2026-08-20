"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

export function Sparkline({ dados, cor }: { dados: number[]; cor: string }) {
  const pontos = dados.map((valor, i) => ({ i, valor }));
  const gradiente = `spark-${cor.replace("#", "")}`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={pontos} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={cor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="valor"
          stroke={cor}
          strokeWidth={1.75}
          fill={`url(#${gradiente})`}
          dot={false}
          isAnimationActive
          animationDuration={700}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
