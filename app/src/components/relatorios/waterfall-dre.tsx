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

// Cada barra recebe uma faixa fixa de largura (não divide o espaço
// disponível igualmente entre N categorias) — com 23 linhas reais de DRE,
// um container 100% responsivo teria comprimido tudo até virar ilegível.
// Em vez disso, a área do gráfico cresce com o número de linhas e rola na
// horizontal, mesmo padrão da matriz mensal.
const LARGURA_POR_BARRA = 64;
const LARGURA_MINIMA = 640;

export function WaterfallDre({ linhas, altura = 420 }: { linhas: LinhaWaterfall[]; altura?: number }) {
  const dados = montarBarras(linhas);
  const semDado = linhas.length === 0 || linhas.every((l) => l.valorDireto === 0);
  const largura = Math.max(LARGURA_MINIMA, dados.length * LARGURA_POR_BARRA);

  return (
    <div className="relative overflow-x-auto">
      <div style={{ width: largura, height: altura }}>
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
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
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
      </div>
      {semDado && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Sem movimentação no período selecionado.
        </p>
      )}
    </div>
  );
}
