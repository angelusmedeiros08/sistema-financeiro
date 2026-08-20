"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatarMoeda } from "@/lib/formatacao";
import { TooltipEscuro } from "@/components/relatorios/tooltip-escuro";

export type SerieComparativo = { chave: string; nome: string; cor: string };

// Barras agrupadas genéricas — hoje só Previsto×Realizado (Fluxo de Caixa);
// Análises Comparativas usa ComparativoLinhaAnotada (linha+anotação).
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
          content={<TooltipEscuro labelFormatter={(chave) => String(chave)} valueFormatter={(valor) => formatarMoeda(valor)} />}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((serie) => (
          <Bar key={serie.chave} dataKey={serie.chave} name={serie.nome} fill={serie.cor} radius={[4, 4, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
