"use client";

import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { PontoFluxo } from "@/app/(app)/painel/dados";
import { formatarMoeda } from "@/lib/formatacao";
import { TooltipEscuro } from "@/components/relatorios/tooltip-escuro";

export function FluxoChart({ dados }: { dados: PontoFluxo[] }) {
  const semMovimento = dados.every((d) => d.resultado === 0);
  const temAnoAnterior = dados.some((d) => d.resultadoAnoAnterior !== null);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={dados} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="fluxoPositivo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1FBE99" />
              <stop offset="100%" stopColor="#0B7A5C" />
            </linearGradient>
            <linearGradient id="fluxoNegativo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D8583A" />
              <stop offset="100%" stopColor="#8F2E24" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="mes"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={
              <TooltipEscuro
                labelFormatter={() => ""}
                valueFormatter={(valor) => formatarMoeda(valor)}
              />
            }
          />
          <Bar dataKey="resultado" name="Este período" radius={[6, 6, 6, 6]} maxBarSize={34} animationDuration={550}>
            {dados.map((d, i) => (
              <Cell key={i} fill={d.resultado >= 0 ? "url(#fluxoPositivo)" : "url(#fluxoNegativo)"} />
            ))}
          </Bar>
          {temAnoAnterior && (
            <Line
              type="monotone"
              dataKey="resultadoAnoAnterior"
              name="Mesmo período, ano anterior"
              stroke="var(--muted-foreground)"
              strokeWidth={1.75}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
              connectNulls
              isAnimationActive
              animationDuration={550}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {semMovimento && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Ainda sem movimentação suficiente para o gráfico.
        </p>
      )}
    </div>
  );
}
