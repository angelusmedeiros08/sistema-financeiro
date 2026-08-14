"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LinhaDreResultado } from "@/lib/relatorios/dre";
import { formatarMoeda } from "@/lib/formatacao";

type BarraWaterfall = {
  rotulo: string;
  base: number;
  altura: number;
  valorReal: number;
  ehSubtotal: boolean;
};

// Waterfall padrão em Recharts: uma série de base invisível + uma série de
// delta visível empilhadas (Seção 4.3 do spec). Linha FOLHA sobe/desce a
// partir do acumulado anterior; linha SUBTOTAL é uma barra cheia do zero
// até o acumulado, marcando o total corrido naquele ponto da cascata.
function montarBarras(linhas: LinhaDreResultado[]): BarraWaterfall[] {
  let acumulado = 0;
  return linhas.map((linha) => {
    if (linha.tipo === "SUBTOTAL") {
      const barra = { rotulo: linha.rotulo, base: 0, altura: linha.valorAcumulado, valorReal: linha.valorAcumulado, ehSubtotal: true };
      return barra;
    }
    const base = acumulado + Math.min(linha.valorDireto, 0);
    const altura = Math.abs(linha.valorDireto);
    acumulado += linha.valorDireto;
    return { rotulo: linha.rotulo, base, altura, valorReal: linha.valorDireto, ehSubtotal: false };
  });
}

export function WaterfallDre({ linhas }: { linhas: LinhaDreResultado[] }) {
  const dados = montarBarras(linhas);
  const semDado = linhas.length === 0 || linhas.every((l) => l.valorDireto === 0 && l.valorAcumulado === 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={dados} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="rotulo"
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={56}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10.5 }}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "0.625rem",
              fontSize: 12,
            }}
            formatter={(_value, _nome, item) => formatarMoeda(Number(item?.payload?.valorReal ?? 0))}
            labelFormatter={(rotulo) => rotulo}
          />
          <Bar dataKey="base" stackId="cascata" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="altura" stackId="cascata" radius={[4, 4, 4, 4]} maxBarSize={40}>
            {dados.map((d, i) => (
              <Cell key={i} fill={d.ehSubtotal ? "#6A56D8" : d.valorReal >= 0 ? "#157F6B" : "#D8583A"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {semDado && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Sem movimentação no período selecionado.
        </p>
      )}
    </div>
  );
}
