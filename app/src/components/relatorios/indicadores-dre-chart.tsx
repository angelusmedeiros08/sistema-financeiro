"use client";

import { useState } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scalePoint } from "@visx/scale";
import { AreaClosed, LinePath, Line } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import type { IndicadorMensal } from "@/lib/relatorios/dre";
import { formatarPercentual } from "@/lib/formatacao";

const SERIES = [
  { chave: "mc", nome: "Margem de contribuição", cor: "#0FA37E" },
  { chave: "margemBruta", nome: "Margem bruta", cor: "#4C7DF0" },
  { chave: "ebitda", nome: "EBITDA", cor: "#E3A62F" },
  { chave: "margemLiquida", nome: "Margem líquida", cor: "#B45FC7" },
] as const;

const MARGEM = { top: 16, right: 12, bottom: 24, left: 48 };

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

// Motor trocado de Recharts pra @visx/shape — mesmas 4 séries (1 área +
// 3 linhas), mesma grade/tooltip escuro do resto de Relatórios.
function GraficoInterno({ dados, largura, altura }: { dados: IndicadorMensal[]; largura: number; altura: number }) {
  const [hoverIndice, setHoverIndice] = useState<number | null>(null);
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<IndicadorMensal>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ scroll: true, detectBounds: true });

  const larguraInterna = Math.max(largura - MARGEM.left - MARGEM.right, 10);
  const alturaInterna = Math.max(altura - MARGEM.top - MARGEM.bottom, 10);

  const todosValores = dados.flatMap((d) => SERIES.map((s) => d[s.chave]));
  const xScale = scalePoint<string>({ domain: dados.map((d) => d.chave), range: [0, larguraInterna], padding: 0.5 });
  const yScale = scaleLinear<number>({ domain: [Math.min(0, ...todosValores), Math.max(...todosValores, 0.01)], range: [alturaInterna, 0], nice: true });

  function aoMoverMouse(evento: React.MouseEvent) {
    const coords = localPoint(evento);
    if (!coords || dados.length === 0) return;
    const passo = larguraInterna / Math.max(dados.length - 1, 1);
    const indice = Math.max(0, Math.min(dados.length - 1, Math.round((coords.x - MARGEM.left) / passo)));
    setHoverIndice(indice);
    showTooltip({ tooltipData: dados[indice], tooltipLeft: coords.x, tooltipTop: coords.y });
  }

  function aoSairMouse() {
    setHoverIndice(null);
    hideTooltip();
  }

  const pontoHover = hoverIndice !== null ? dados[hoverIndice] : null;
  const xHover = pontoHover ? (xScale(pontoHover.chave) ?? null) : null;

  return (
    <div ref={containerRef} className="relative">
      <svg width={largura} height={altura}>
        <defs>
          <linearGradient id="areaMargemContribuicao" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0FA37E" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#0FA37E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Group left={MARGEM.left} top={MARGEM.top}>
          <GridRows scale={yScale} width={larguraInterna} stroke="var(--border)" />

          <AreaClosed
            data={dados}
            x={(d) => xScale(d.chave) ?? 0}
            y={(d) => yScale(d.mc)}
            yScale={yScale}
            fill="url(#areaMargemContribuicao)"
            curve={curveMonotoneX}
          />
          {SERIES.map((serie) => (
            <LinePath
              key={serie.chave}
              data={dados}
              x={(d) => xScale(d.chave) ?? 0}
              y={(d) => yScale(d[serie.chave])}
              stroke={serie.cor}
              strokeWidth={2.25}
              curve={curveMonotoneX}
            />
          ))}

          {xHover !== null && pontoHover && (
            <>
              <Line from={{ x: xHover, y: 0 }} to={{ x: xHover, y: alturaInterna }} stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" />
              {SERIES.map((serie) => (
                <circle key={serie.chave} cx={xHover} cy={yScale(pontoHover[serie.chave])} r={4} fill={serie.cor} stroke="var(--card)" strokeWidth={2} />
              ))}
            </>
          )}

          <AxisLeft
            scale={yScale}
            tickFormat={(v) => formatarPercentual(Number(v))}
            tickLabelProps={() => ({ fill: "var(--muted-foreground)", fontSize: 11, textAnchor: "end", dx: -4, dy: 4 })}
            hideAxisLine
            hideTicks
          />
          <AxisBottom
            top={alturaInterna}
            scale={xScale}
            tickLabelProps={() => ({ fill: "var(--muted-foreground)", fontSize: 11, textAnchor: "middle" })}
            hideAxisLine
            tickStroke="var(--border)"
          />

          <rect width={larguraInterna} height={alturaInterna} fill="transparent" onMouseMove={aoMoverMouse} onMouseLeave={aoSairMouse} />
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipInPortal left={tooltipLeft} top={tooltipTop} style={estiloTooltip}>
          <div className="mb-1 font-semibold text-white/60">{tooltipData.chave}</div>
          <div className="flex flex-col gap-1">
            {SERIES.map((serie) => (
              <div key={serie.chave} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: serie.cor }} />
                <span className="text-white/70">{serie.nome}</span>
                <span className="ml-auto font-bold tabular-nums">{formatarPercentual(tooltipData[serie.chave])}</span>
              </div>
            ))}
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export function IndicadoresDreChart({ dados, altura = 220 }: { dados: IndicadorMensal[]; altura?: number }) {
  const semDado = dados.every((d) => d.mc === 0 && d.margemBruta === 0 && d.ebitda === 0 && d.margemLiquida === 0);

  return (
    <div>
      <div className="relative" style={{ height: altura }}>
        <ParentSize>{({ width }) => (width > 0 ? <GraficoInterno dados={dados} largura={width} altura={altura} /> : null)}</ParentSize>
        {semDado && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Sem movimentação suficiente no ano selecionado.
          </p>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-muted-foreground">
        {SERIES.map((serie) => (
          <span key={serie.chave} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: serie.cor }} />
            {serie.nome}
          </span>
        ))}
      </div>
    </div>
  );
}
