"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { PontoFluxo } from "@/app/(app)/painel/dados";
import { formatarMoeda } from "@/lib/formatacao";

export function FluxoChart({ dados }: { dados: PontoFluxo[] }) {
  const semMovimento = dados.every((d) => d.resultado === 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={dados} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
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
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "0.625rem",
              fontSize: 12,
            }}
            formatter={(value) => formatarMoeda(Number(value))}
            labelFormatter={() => ""}
          />
          <Bar dataKey="resultado" radius={[6, 6, 6, 6]} maxBarSize={34} animationDuration={550}>
            {dados.map((d, i) => (
              <Cell key={i} fill={d.resultado >= 0 ? "url(#fluxoPositivo)" : "url(#fluxoNegativo)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {semMovimento && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Ainda sem movimentação suficiente para o gráfico.
        </p>
      )}
    </div>
  );
}
