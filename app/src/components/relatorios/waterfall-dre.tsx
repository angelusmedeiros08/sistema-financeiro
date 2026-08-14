"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Database } from "@/utils/supabase/database.types";
import { formatarMoeda } from "@/lib/formatacao";

type LinhaWaterfall = { rotulo: string; tipoCalc: Database["public"]["Enums"]["tipo_linha_dre"]; valorDireto: number };

type BarraWaterfall = {
  rotulo: string;
  base: number;
  altura: number;
  valorReal: number;
  cor: string;
};

// Waterfall padrão em Recharts: uma série de base invisível + uma série de
// delta visível empilhadas. Linha FOLHA sobe/desce a partir do acumulado
// anterior; SUBTOTAL/SUBTOTAL_ALTERNATIVO/RESULTADO_NAO_OPERACIONAL são
// barra cheia do zero até o valor já calculado pela cascata (dre.ts já
// resolveu o que cada uma delas significa — aqui só desenha).
function montarBarras(linhas: LinhaWaterfall[]): BarraWaterfall[] {
  let acumulado = 0;
  return linhas.map((linha) => {
    if (linha.tipoCalc === "FOLHA") {
      const base = acumulado + Math.min(linha.valorDireto, 0);
      const altura = Math.abs(linha.valorDireto);
      acumulado += linha.valorDireto;
      return { rotulo: linha.rotulo, base, altura, valorReal: linha.valorDireto, cor: linha.valorDireto >= 0 ? "#157F6B" : "#D8583A" };
    }
    const cor = linha.tipoCalc === "RESULTADO_NAO_OPERACIONAL" ? "#C98A1F" : "#6A56D8";
    return { rotulo: linha.rotulo, base: 0, altura: linha.valorDireto, valorReal: linha.valorDireto, cor };
  });
}

// A área do gráfico é sempre 100% responsiva à largura do card — nunca
// depende de scroll horizontal do mouse pra revelar barra cortada. Com 23
// linhas reais de DRE, a legibilidade vem do rótulo rotacionado + fonte
// menor, não de expandir o canvas além do container.
export function WaterfallDre({ linhas, altura = 420 }: { linhas: LinhaWaterfall[]; altura?: number }) {
  const dados = montarBarras(linhas);
  const semDado = linhas.length === 0 || linhas.every((l) => l.valorDireto === 0);

  return (
    <div className="relative" style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="rotulo"
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-40}
            textAnchor="end"
            height={110}
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
          <Bar dataKey="altura" stackId="cascata" radius={[4, 4, 4, 4]} maxBarSize={48}>
            {dados.map((d, i) => (
              <Cell key={i} fill={d.cor} />
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
