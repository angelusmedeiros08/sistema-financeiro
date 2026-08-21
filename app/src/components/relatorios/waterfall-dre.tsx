"use client";

import { useState } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar, Line } from "@visx/shape";
import { Group } from "@visx/group";
import { AxisBottom } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import type { Database } from "@/utils/supabase/database.types";
import { formatarMoeda, formatarNumeroAbreviado } from "@/lib/formatacao";

type LinhaWaterfall = { rotulo: string; tipoCalc: Database["public"]["Enums"]["tipo_linha_dre"]; valorDireto: number };

type BarraWaterfall = {
  rotulo: string;
  baixo: number;
  alto: number;
  valorReal: number;
  cor: string;
  nivelConector: number;
};

// Waterfall de verdade via @visx/shape em vez do truque de "base invisível +
// delta empilhado" do Recharts — dá controle total pra desenhar os
// conectores tracejados entre barras (o nível acumulado "escorre" de uma
// coluna pra outra) e o rótulo flutuante de valor acima/abaixo de cada
// barra, os dois recursos que só compensavam migrar de lib por causa deles
// (ver docs/pesquisa-referencias-visuais-reforma-design.md §5).
function montarBarras(linhas: LinhaWaterfall[]): BarraWaterfall[] {
  let acumulado = 0;
  return linhas.map((linha) => {
    if (linha.tipoCalc === "FOLHA") {
      const inicio = acumulado;
      acumulado += linha.valorDireto;
      return {
        rotulo: linha.rotulo,
        baixo: Math.min(inicio, acumulado),
        alto: Math.max(inicio, acumulado),
        valorReal: linha.valorDireto,
        cor: linha.valorDireto >= 0 ? "#0FA37E" : "#B23A2E",
        nivelConector: acumulado,
      };
    }
    const cor = linha.tipoCalc === "RESULTADO_NAO_OPERACIONAL" ? "#E3A62F" : "#4C7DF0";
    return {
      rotulo: linha.rotulo,
      baixo: Math.min(0, linha.valorDireto),
      alto: Math.max(0, linha.valorDireto),
      valorReal: linha.valorDireto,
      cor,
      nivelConector: linha.valorDireto,
    };
  });
}

const MARGEM = { top: 28, right: 12, bottom: 110, left: 12 };

const estiloTooltip = {
  ...defaultStyles,
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: "0.625rem",
  padding: "8px 12px",
  fontSize: 12,
  boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
};

function GraficoInterno({ barras, largura, altura }: { barras: BarraWaterfall[]; largura: number; altura: number }) {
  const [hoverIndice, setHoverIndice] = useState<number | null>(null);
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<BarraWaterfall>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ scroll: true, detectBounds: true });

  const larguraInterna = Math.max(largura - MARGEM.left - MARGEM.right, 10);
  const alturaInterna = Math.max(altura - MARGEM.top - MARGEM.bottom, 10);

  const todosValores = barras.flatMap((b) => [b.baixo, b.alto, 0]);
  const yScale = scaleLinear<number>({
    domain: [Math.min(...todosValores), Math.max(...todosValores)],
    range: [alturaInterna, 0],
    nice: true,
  });
  const xScale = scaleBand<string>({
    domain: barras.map((b) => b.rotulo),
    range: [0, larguraInterna],
    padding: 0.35,
  });

  function aoPassarMouse(evento: React.MouseEvent, barra: BarraWaterfall, indice: number) {
    const coords = localPoint(evento) ?? { x: 0, y: 0 };
    setHoverIndice(indice);
    showTooltip({ tooltipData: barra, tooltipLeft: coords.x, tooltipTop: coords.y });
  }

  function aoSairMouse() {
    setHoverIndice(null);
    hideTooltip();
  }

  return (
    <div ref={containerRef} className="relative">
      <svg width={largura} height={altura}>
        <Group left={MARGEM.left} top={MARGEM.top}>
          <GridRows scale={yScale} width={larguraInterna} stroke="var(--border)" />
          <Line
            from={{ x: 0, y: yScale(0) }}
            to={{ x: larguraInterna, y: yScale(0) }}
            stroke="var(--border)"
            strokeWidth={1}
          />

          {barras.slice(0, -1).map((barra, i) => {
            const proxima = barras[i + 1];
            const xFim = (xScale(barra.rotulo) ?? 0) + xScale.bandwidth();
            const xInicio = xScale(proxima.rotulo) ?? 0;
            const y = yScale(barra.nivelConector);
            return (
              <Line
                key={`conector-${barra.rotulo}`}
                from={{ x: xFim, y }}
                to={{ x: xInicio, y }}
                stroke="var(--muted-foreground)"
                strokeDasharray="3 3"
                strokeWidth={1}
                opacity={0.6}
              />
            );
          })}

          {barras.map((barra, i) => {
            const x = xScale(barra.rotulo) ?? 0;
            const y = yScale(barra.alto);
            const h = Math.max(yScale(barra.baixo) - yScale(barra.alto), 1);
            const emHover = hoverIndice === i;
            const rotuloAcimaOuAbaixo = barra.valorReal >= 0 ? y - 6 : y + h + 14;
            return (
              <Group key={barra.rotulo}>
                <Bar
                  x={x}
                  y={y}
                  width={xScale.bandwidth()}
                  height={h}
                  fill={barra.cor}
                  rx={4}
                  opacity={hoverIndice === null || emHover ? 1 : 0.55}
                  style={{ transition: "opacity 0.15s ease", cursor: "pointer" }}
                  onMouseMove={(e) => aoPassarMouse(e, barra, i)}
                  onMouseLeave={aoSairMouse}
                />
                <text
                  x={x + xScale.bandwidth() / 2}
                  y={rotuloAcimaOuAbaixo}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill="var(--muted-foreground)"
                  pointerEvents="none"
                >
                  {formatarNumeroAbreviado(barra.valorReal)}
                </text>
              </Group>
            );
          })}
        </Group>

        <Group left={MARGEM.left} top={MARGEM.top + alturaInterna}>
          <AxisBottom
            scale={xScale}
            tickLabelProps={() => ({
              fill: "var(--muted-foreground)",
              fontSize: 10.5,
              textAnchor: "end",
              angle: -55,
              dy: "0.3em",
              dx: "-0.3em",
            })}
            hideAxisLine
            tickStroke="var(--border)"
          />
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipInPortal left={tooltipLeft} top={tooltipTop} style={estiloTooltip}>
          <div className="font-semibold">{tooltipData.rotulo}</div>
          <div className="text-muted-foreground">{formatarMoeda(tooltipData.valorReal)}</div>
        </TooltipInPortal>
      )}
    </div>
  );
}

// Piso de largura por barra — sem isso, uma DRE com muitas linhas (a
// estrutura é configurável por tenant) espreme o bandwidth até o rótulo
// flutuante de valor e o rótulo do eixo colidirem uns com os outros
// (confirmado: 15+ linhas já colidia comprimido na largura do card). Com
// o piso, o gráfico passa a rolar horizontalmente em vez de comprimir.
const LARGURA_MIN_POR_BARRA = 68;

export function WaterfallDre({ linhas, altura = 420 }: { linhas: LinhaWaterfall[]; altura?: number }) {
  const barras = montarBarras(linhas);
  const semDado = linhas.length === 0 || linhas.every((l) => l.valorDireto === 0);

  return (
    <div className="relative" style={{ height: altura }}>
      {semDado ? (
        <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Sem movimentação no período selecionado.
        </p>
      ) : (
        <ParentSize>
          {({ width }) => {
            if (width <= 0) return null;
            const larguraNecessaria = Math.max(width, barras.length * LARGURA_MIN_POR_BARRA + MARGEM.left + MARGEM.right);
            return (
              <div className="h-full overflow-x-auto">
                <GraficoInterno barras={barras} largura={larguraNecessaria} altura={altura} />
              </div>
            );
          }}
        </ParentSize>
      )}
    </div>
  );
}
