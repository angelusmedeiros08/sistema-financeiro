"use client";

import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PontoEvolucaoPE } from "@/lib/relatorios/ponto-equilibrio";
import { formatarMoeda, formatarNumeroCompacto, formatarPercentual } from "@/lib/formatacao";
import { TooltipEscuro } from "./tooltip-escuro";

// Duas séries de escalas bem diferentes (R$ vs. %) — dois eixos Y, mesmo
// padrão de tooltip/grade do resto de Relatórios.
export function EvolucaoPontoEquilibrioChart({ dados, altura = 320 }: { dados: PontoEvolucaoPE[]; altura?: number }) {
  const semDado = dados.every((d) => d.pontoEquilibrio === 0 && d.margemContribuicaoPercentual === 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={altura}>
        <ComposedChart data={dados} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="areaPontoEquilibrio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4C7DF0" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#4C7DF0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="chave" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <YAxis
            yAxisId="pe"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(v) => formatarNumeroCompacto(v)}
            width={56}
          />
          <YAxis
            yAxisId="mc"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(v) => formatarPercentual(v)}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3", strokeWidth: 1 }}
            content={
              <TooltipEscuro
                valueFormatter={(valor, nome) => (nome === "Margem de contribuição %" ? formatarPercentual(valor) : formatarMoeda(valor))}
              />
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            yAxisId="pe"
            type="monotone"
            dataKey="pontoEquilibrio"
            name="Ponto de equilíbrio"
            stroke="#4C7DF0"
            strokeWidth={2.25}
            fill="url(#areaPontoEquilibrio)"
            dot={{ r: 3, fill: "#4C7DF0", strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            animationDuration={600}
          />
          <Line
            yAxisId="mc"
            type="monotone"
            dataKey="margemContribuicaoPercentual"
            name="Margem de contribuição %"
            stroke="#0FA37E"
            strokeWidth={2.25}
            dot={{ r: 3, fill: "#0FA37E", strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            animationDuration={600}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {semDado && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Sem movimentação suficiente no ano selecionado.
        </p>
      )}
    </div>
  );
}
