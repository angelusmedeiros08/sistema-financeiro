"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { IndicadorMensal } from "@/lib/relatorios/dre";
import { formatarPercentual } from "@/lib/formatacao";

const SERIES = [
  { chave: "mc", nome: "Margem de contribuição", cor: "#157F6B" },
  { chave: "margemBruta", nome: "Margem bruta", cor: "#6A56D8" },
  { chave: "ebitda", nome: "EBITDA", cor: "#C98A1F" },
  { chave: "margemLiquida", nome: "Margem líquida", cor: "#D8583A" },
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
        <LineChart data={dados} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
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
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "0.625rem",
              fontSize: 12,
            }}
            formatter={(value) => formatarPercentual(Number(value))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {SERIES.map((serie) => (
            <Line
              key={serie.chave}
              type="monotone"
              dataKey={serie.chave}
              name={serie.nome}
              stroke={serie.cor}
              strokeWidth={2}
              dot={{ r: 3, fill: serie.cor, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          ))}
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
