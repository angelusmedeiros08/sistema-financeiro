"use client";

import { Area, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { PontoFluxo } from "@/app/(app)/painel/dados";
import { formatarMoeda } from "@/lib/formatacao";
import { TooltipEscuro } from "@/components/relatorios/tooltip-escuro";

// Duas áreas sobrepostas (receitas × despesas), não uma barra de líquido —
// padrão confirmado em toda referência comercial mandada pelo usuário
// (FiraCast, FinEz: duas séries de fluxo bruto, curva suave, área
// preenchida com opacidade baixa por baixo da linha).
export function FluxoChart({ dados }: { dados: PontoFluxo[] }) {
  const semMovimento = dados.every((d) => d.receitas === 0 && d.despesas === 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={dados} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="areaReceitas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0FA37E" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#0FA37E" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="areaDespesas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B23A2E" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#B23A2E" stopOpacity={0} />
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
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3", strokeWidth: 1 }}
            content={<TooltipEscuro labelFormatter={(mes) => String(mes)} valueFormatter={(valor) => formatarMoeda(valor)} />}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
          <Area
            type="monotone"
            dataKey="receitas"
            name="Receitas"
            stroke="#0FA37E"
            strokeWidth={2.25}
            fill="url(#areaReceitas)"
            dot={{ r: 3, fill: "#0FA37E", strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={650}
          />
          <Area
            type="monotone"
            dataKey="despesas"
            name="Despesas"
            stroke="#B23A2E"
            strokeWidth={2.25}
            fill="url(#areaDespesas)"
            dot={{ r: 3, fill: "#B23A2E", strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={650}
          />
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
