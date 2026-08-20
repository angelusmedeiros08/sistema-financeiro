"use client";

import { Line, LineChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PontoSerieSaldo } from "@/lib/relatorios/saldo-projetado";
import { formatarMoeda, formatarNumeroCompacto } from "@/lib/formatacao";
import { TooltipEscuro } from "./tooltip-escuro";

function rotuloDias(dias: number): string {
  if (dias === 0) return "Hoje";
  return dias < 0 ? `${dias}d` : `+${dias}d`;
}

export function SaldoProjetadoChart({ pontos, limiar }: { pontos: PontoSerieSaldo[]; limiar: number }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={pontos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="dias"
          tickFormatter={rotuloDias}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v) => formatarNumeroCompacto(v)}
          axisLine={false}
          tickLine={false}
          width={48}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <Tooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3", strokeWidth: 1 }}
          content={<TooltipEscuro labelFormatter={(dias) => rotuloDias(Number(dias))} valueFormatter={(valor) => formatarMoeda(valor)} />}
        />
        <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
        {limiar > 0 && <ReferenceLine y={limiar} stroke="#B23A2E" strokeDasharray="4 2" label={{ value: "Colchão mínimo", position: "insideTopLeft", fill: "#B23A2E", fontSize: 10 }} />}
        <Line type="monotone" dataKey="realizado" name="Realizado" stroke="#0FA37E" strokeWidth={2.25} dot={{ r: 3, fill: "#0FA37E" }} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }} connectNulls={false} isAnimationActive animationDuration={600} />
        <Line type="monotone" dataKey="projetado" name="Projetado" stroke="#4C7DF0" strokeWidth={2.25} strokeDasharray="5 4" dot={{ r: 3, fill: "#4C7DF0" }} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }} connectNulls={false} isAnimationActive animationDuration={600} />
      </LineChart>
    </ResponsiveContainer>
  );
}
