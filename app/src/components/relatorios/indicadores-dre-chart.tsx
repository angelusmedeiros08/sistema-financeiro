"use client";

import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { IndicadorMensal } from "@/lib/relatorios/dre";
import { formatarPercentual } from "@/lib/formatacao";
import { TooltipEscuro } from "./tooltip-escuro";

const SERIES = [
  { chave: "mc", nome: "Margem de contribuição", cor: "#0FA37E" },
  { chave: "margemBruta", nome: "Margem bruta", cor: "#4C7DF0" },
  { chave: "ebitda", nome: "EBITDA", cor: "#E3A62F" },
  { chave: "margemLiquida", nome: "Margem líquida", cor: "#B45FC7" },
] as const;

// Série mensal de indicadores — todos % sobre a receita líquida, derivados
// de linhas que já existem na matriz (nenhum cálculo novo). Mesma grade e
// formatação de tooltip do resto de Relatórios, só que em linha (evolução
// no tempo) em vez de barra.
export function IndicadoresDreChart({ dados, altura = 220 }: { dados: IndicadorMensal[]; altura?: number }) {
  const semDado = dados.every((d) => d.mc === 0 && d.margemBruta === 0 && d.ebitda === 0 && d.margemLiquida === 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={altura}>
        <ComposedChart data={dados} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="areaMargemContribuicao" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0FA37E" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#0FA37E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="chave" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(v) => formatarPercentual(v)}
            width={52}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3", strokeWidth: 1 }}
            content={<TooltipEscuro valueFormatter={(valor) => formatarPercentual(valor)} />}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {SERIES.map((serie) =>
            serie.chave === "mc" ? (
              <Area
                key={serie.chave}
                type="monotone"
                dataKey={serie.chave}
                name={serie.nome}
                stroke={serie.cor}
                strokeWidth={2.25}
                fill="url(#areaMargemContribuicao)"
                dot={{ r: 3, fill: serie.cor, strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                animationDuration={600}
              />
            ) : (
              <Line
                key={serie.chave}
                type="monotone"
                dataKey={serie.chave}
                name={serie.nome}
                stroke={serie.cor}
                strokeWidth={2.25}
                dot={{ r: 3, fill: serie.cor, strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                animationDuration={600}
              />
            ),
          )}
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
