"use client";

import { useState } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scalePoint } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { AxisBottom } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { Annotation, Connector, CircleSubject, Label } from "@visx/annotation";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { formatarNumeroCompacto, formatarPercentual } from "@/lib/formatacao";

export type PontoComparativo = { chave: string; atual: number; comparacao: number; variacaoPercentual: number };

const MARGEM = { top: 32, right: 16, bottom: 28, left: 12 };

const estiloTooltip = {
  ...defaultStyles,
  background: "#1A1D1F",
  color: "#fff",
  border: "none",
  borderRadius: "0.625rem",
  padding: "8px 12px",
  fontSize: 12,
  boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
};

// Duas linhas suaves (atual colorido, comparação em cinza-fantasma) com o
// rótulo de variação % flutuando no último ponto via @visx/annotation —
// padrão do mockup "KPI Dashboard" mandado pelo usuário (linha-fantasma +
// callout de variação direto no gráfico, não só numa tabela ao lado).
function GraficoInterno({
  pontos,
  nomeComparacao,
  mostrarAnotacao,
  largura,
  altura,
}: {
  pontos: PontoComparativo[];
  nomeComparacao: string;
  mostrarAnotacao: boolean;
  largura: number;
  altura: number;
}) {
  const [hoverIndice, setHoverIndice] = useState<number | null>(null);
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<PontoComparativo>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ scroll: true, detectBounds: true });

  const larguraInterna = Math.max(largura - MARGEM.left - MARGEM.right, 10);
  const alturaInterna = Math.max(altura - MARGEM.top - MARGEM.bottom, 10);

  const todosValores = pontos.flatMap((p) => [p.atual, p.comparacao]);
  const yScale = scaleLinear<number>({ domain: [Math.min(0, ...todosValores), Math.max(...todosValores)], range: [alturaInterna, 0], nice: true });
  const xScale = scalePoint<string>({ domain: pontos.map((p) => p.chave), range: [0, larguraInterna], padding: 0.5 });

  const ultimo = pontos[pontos.length - 1];
  const xUltimo = xScale(ultimo.chave) ?? 0;
  const yUltimo = yScale(ultimo.atual);

  function aoMoverMouse(evento: React.MouseEvent, indice: number) {
    const coords = localPoint(evento) ?? { x: 0, y: 0 };
    setHoverIndice(indice);
    showTooltip({ tooltipData: pontos[indice], tooltipLeft: coords.x, tooltipTop: coords.y });
  }

  return (
    <div ref={containerRef} className="relative">
      <svg width={largura} height={altura}>
        <Group left={MARGEM.left} top={MARGEM.top}>
          <GridRows scale={yScale} width={larguraInterna} stroke="var(--border)" />

          <LinePath
            data={pontos}
            x={(p) => xScale(p.chave) ?? 0}
            y={(p) => yScale(p.comparacao)}
            stroke="var(--muted-foreground)"
            strokeWidth={1.75}
            strokeDasharray="5 4"
            curve={curveMonotoneX}
          />
          <LinePath
            data={pontos}
            x={(p) => xScale(p.chave) ?? 0}
            y={(p) => yScale(p.atual)}
            stroke="#4C7DF0"
            strokeWidth={2.5}
            curve={curveMonotoneX}
          />

          {pontos.map((p, i) => (
            <circle
              key={p.chave}
              cx={xScale(p.chave) ?? 0}
              cy={yScale(p.atual)}
              r={hoverIndice === i ? 5 : 3}
              fill="#4C7DF0"
              stroke="var(--card)"
              strokeWidth={2}
              style={{ transition: "r 0.1s ease", cursor: "pointer" }}
              onMouseMove={(e) => aoMoverMouse(e, i)}
              onMouseLeave={() => {
                setHoverIndice(null);
                hideTooltip();
              }}
            />
          ))}

          {mostrarAnotacao && (
            <Annotation x={xUltimo} y={yUltimo} dx={largura - xUltimo > 90 ? 42 : -52} dy={ultimo.variacaoPercentual >= 0 ? -30 : 30}>
              <Connector stroke="var(--muted-foreground)" />
              <CircleSubject radius={3} stroke="#4C7DF0" />
              <Label
                backgroundFill="#1A1D1F"
                showAnchorLine={false}
                title={`${ultimo.variacaoPercentual >= 0 ? "+" : ""}${formatarPercentual(ultimo.variacaoPercentual)}`}
                titleFontSize={12}
                titleFontWeight={700}
                horizontalAnchor={largura - xUltimo > 90 ? "start" : "end"}
                backgroundPadding={{ left: 8, right: 8, top: 6, bottom: 6 }}
                fontColor="#fff"
              />
            </Annotation>
          )}

          <AxisBottom
            top={alturaInterna}
            scale={xScale}
            tickLabelProps={() => ({ fill: "var(--muted-foreground)", fontSize: 11, textAnchor: "middle" })}
            hideAxisLine
            tickStroke="var(--border)"
          />
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipInPortal left={tooltipLeft} top={tooltipTop} style={estiloTooltip}>
          <div className="mb-1 font-semibold text-white/60">{tooltipData.chave}</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#4C7DF0]" />
              <span className="text-white/70">Período</span>
              <span className="ml-auto font-bold tabular-nums">{formatarNumeroCompacto(tooltipData.atual)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-white/40" />
              <span className="text-white/70">{nomeComparacao}</span>
              <span className="ml-auto font-bold tabular-nums">{formatarNumeroCompacto(tooltipData.comparacao)}</span>
            </div>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export function ComparativoLinhaAnotada({
  pontos,
  nomeComparacao,
  mostrarAnotacao = true,
  altura = 300,
}: {
  pontos: PontoComparativo[];
  nomeComparacao: string;
  mostrarAnotacao?: boolean;
  altura?: number;
}) {
  return (
    <div>
      {/* Legenda fora do ParentSize: o wrapper interno dele é
          position:absolute + overflow:hidden do tamanho exato do
          container, então qualquer coisa depois do <svg> ali dentro fica
          cortada em silêncio. */}
      <div style={{ height: altura }}>
        <ParentSize>
          {({ width }) =>
            width > 0 ? (
              <GraficoInterno pontos={pontos} nomeComparacao={nomeComparacao} mostrarAnotacao={mostrarAnotacao} largura={width} altura={altura} />
            ) : null
          }
        </ParentSize>
      </div>
      <div className="mt-1 flex items-center gap-4 text-[11px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-[2px] w-4 rounded-full bg-[#4C7DF0]" /> Período
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-[2px] w-4 rounded-full bg-muted-foreground"
            style={{ backgroundImage: "repeating-linear-gradient(90deg,var(--muted-foreground) 0 4px,transparent 4px 7px)" }}
          />
          {nomeComparacao}
        </span>
      </div>
    </div>
  );
}
