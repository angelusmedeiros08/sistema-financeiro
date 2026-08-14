"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatarMoeda } from "@/lib/formatacao";

export type SerieComparativo = { chave: string; nome: string; cor: string };

// Barras agrupadas genéricas — Previsto×Realizado, e reaproveitado pelas
// Análises Comparativas (AH/YoY) — mesma grade/tooltip do FluxoChart, só
// com N séries lado a lado em vez de uma.
export function ComparativoBarras({
  dados,
  eixoX,
  series,
  altura = 300,
}: {
  dados: Record<string, number | string>[];
  eixoX: string;
  series: SerieComparativo[];
  altura?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey={eixoX} axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "0.625rem",
            fontSize: 12,
          }}
          formatter={(value) => formatarMoeda(Number(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((serie) => (
          <Bar key={serie.chave} dataKey={serie.chave} name={serie.nome} fill={serie.cor} radius={[4, 4, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
