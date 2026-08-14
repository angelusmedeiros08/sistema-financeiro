"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PontoEvolucaoPE } from "@/lib/relatorios/ponto-equilibrio";
import { formatarMoeda, formatarNumeroCompacto, formatarPercentual } from "@/lib/formatacao";

// Duas séries de escalas bem diferentes (R$ vs. %) — dois eixos Y, mesmo
// padrão de tooltip/grade do resto de Relatórios.
export function EvolucaoPontoEquilibrioChart({ dados, altura = 320 }: { dados: PontoEvolucaoPE[]; altura?: number }) {
  const semDado = dados.every((d) => d.pontoEquilibrio === 0 && d.margemContribuicaoPercentual === 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={altura}>
        <LineChart data={dados} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
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
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "0.625rem",
              fontSize: 12,
            }}
            formatter={(value, nome) => (nome === "Margem de contribuição %" ? formatarPercentual(Number(value)) : formatarMoeda(Number(value)))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="pe"
            type="monotone"
            dataKey="pontoEquilibrio"
            name="Ponto de equilíbrio"
            stroke="#6A56D8"
            strokeWidth={2}
            dot={{ r: 3, fill: "#6A56D8", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="mc"
            type="monotone"
            dataKey="margemContribuicaoPercentual"
            name="Margem de contribuição %"
            stroke="#157F6B"
            strokeWidth={2}
            dot={{ r: 3, fill: "#157F6B", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {semDado && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Sem movimentação suficiente no ano selecionado.
        </p>
      )}
    </div>
  );
}
