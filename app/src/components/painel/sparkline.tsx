"use client";

import { useId } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";

function GraficoInterno({ dados, cor, largura, altura }: { dados: number[]; cor: string; largura: number; altura: number }) {
  // id do gradiente vem de useId(), não do valor de `cor` — desde que `cor`
  // passou a poder ser um token tipo "var(--positivo)" (não só hex), um id
  // derivado do texto da cor virava algo como "spark-var(--positivo)": os
  // parênteses quebram a referência url(#...) e a área cai pra preto sólido.
  const gradiente = `spark-${useId()}`;
  const pontos = dados.map((valor, i) => ({ i, valor }));
  const xScale = scaleLinear<number>({ domain: [0, Math.max(dados.length - 1, 1)], range: [0, largura] });
  const yScale = scaleLinear<number>({ domain: [Math.min(...dados, 0), Math.max(...dados, 1)], range: [altura - 2, 2] });

  return (
    // Decorativo — sempre embutido dentro de um StatCard/IndicadorGauge que
    // já descreve o valor por texto; dar aria-label aqui narraria a mesma
    // informação 2x pra leitor de tela. aria-hidden é o tratamento certo,
    // não um aria-label genérico "tendência" sem valor informativo.
    <svg width={largura} height={altura} aria-hidden="true">
      <defs>
        <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity={0.35} />
          <stop offset="100%" stopColor={cor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <AreaClosed
        data={pontos}
        x={(d) => xScale(d.i)}
        y={(d) => yScale(d.valor)}
        yScale={yScale}
        fill={`url(#${gradiente})`}
        curve={curveMonotoneX}
      />
      <LinePath data={pontos} x={(d) => xScale(d.i)} y={(d) => yScale(d.valor)} stroke={cor} strokeWidth={1.75} curve={curveMonotoneX} />
    </svg>
  );
}

// Motor trocado de Recharts pra @visx/shape, consistente com o resto dos
// gráficos — sem eixo/tooltip/interação de propósito, é só a linha de
// tendência compacta usada dentro de StatCard e IndicadorGauge.
export function Sparkline({ dados, cor }: { dados: number[]; cor: string }) {
  return (
    <ParentSize>
      {({ width, height }) => (width > 0 && height > 0 ? <GraficoInterno dados={dados} cor={cor} largura={width} altura={height} /> : null)}
    </ParentSize>
  );
}
