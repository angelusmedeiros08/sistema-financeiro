"use client";

import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";

function GraficoInterno({ dados, cor, largura, altura }: { dados: number[]; cor: string; largura: number; altura: number }) {
  const gradiente = `spark-${cor.replace("#", "")}`;
  const pontos = dados.map((valor, i) => ({ i, valor }));
  const xScale = scaleLinear<number>({ domain: [0, Math.max(dados.length - 1, 1)], range: [0, largura] });
  const yScale = scaleLinear<number>({ domain: [Math.min(...dados, 0), Math.max(...dados, 1)], range: [altura - 2, 2] });

  return (
    <svg width={largura} height={altura}>
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
