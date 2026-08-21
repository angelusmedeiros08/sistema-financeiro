"use client";

import { useState } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scalePoint } from "@visx/scale";
import { AreaClosed, LinePath, Line } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft, AxisRight } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import type { PontoEvolucaoPE } from "@/lib/relatorios/ponto-equilibrio";
import { formatarMoeda, formatarNumeroCompacto, formatarPercentual } from "@/lib/formatacao";

const MARGEM = { top: 16, right: 48, bottom: 24, left: 56 };

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

// Motor trocado de Recharts pra @visx/shape — duas escalas Y
// independentes (R$ à esquerda pro ponto de equilíbrio, % à direita pra
// margem de contribuição), cada uma alimentando seu próprio eixo e sua
// própria série, mesmo padrão de tooltip/grade do resto de Relatórios.
function GraficoInterno({ dados, largura, altura }: { dados: PontoEvolucaoPE[]; largura: number; altura: number }) {
  const [hoverIndice, setHoverIndice] = useState<number | null>(null);
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<PontoEvolucaoPE>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ scroll: true, detectBounds: true });

  const larguraInterna = Math.max(largura - MARGEM.left - MARGEM.right, 10);
  const alturaInterna = Math.max(altura - MARGEM.top - MARGEM.bottom, 10);

  const xScale = scalePoint<string>({ domain: dados.map((d) => d.chave), range: [0, larguraInterna], padding: 0.5 });
  const yScalePE = scaleLinear<number>({
    domain: [0, Math.max(...dados.map((d) => d.pontoEquilibrio), 1)],
    range: [alturaInterna, 0],
    nice: true,
  });
  const yScaleMc = scaleLinear<number>({
    domain: [0, Math.max(...dados.map((d) => d.margemContribuicaoPercentual), 0.01)],
    range: [alturaInterna, 0],
    nice: true,
  });

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
          <linearGradient id="areaPontoEquilibrio" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4C7DF0" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#4C7DF0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Group left={MARGEM.left} top={MARGEM.top}>
          <GridRows scale={yScalePE} width={larguraInterna} stroke="var(--border)" />

          <AreaClosed
            data={dados}
            x={(d) => xScale(d.chave) ?? 0}
            y={(d) => yScalePE(d.pontoEquilibrio)}
            yScale={yScalePE}
            fill="url(#areaPontoEquilibrio)"
            curve={curveMonotoneX}
          />
          <LinePath data={dados} x={(d) => xScale(d.chave) ?? 0} y={(d) => yScalePE(d.pontoEquilibrio)} stroke="#4C7DF0" strokeWidth={2.25} curve={curveMonotoneX} />
          <LinePath
            data={dados}
            x={(d) => xScale(d.chave) ?? 0}
            y={(d) => yScaleMc(d.margemContribuicaoPercentual)}
            stroke="#0FA37E"
            strokeWidth={2.25}
            curve={curveMonotoneX}
          />

          {xHover !== null && pontoHover && (
            <>
              <Line from={{ x: xHover, y: 0 }} to={{ x: xHover, y: alturaInterna }} stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={xHover} cy={yScalePE(pontoHover.pontoEquilibrio)} r={4} fill="#4C7DF0" stroke="var(--card)" strokeWidth={2} />
              <circle cx={xHover} cy={yScaleMc(pontoHover.margemContribuicaoPercentual)} r={4} fill="#0FA37E" stroke="var(--card)" strokeWidth={2} />
            </>
          )}

          <AxisLeft
            scale={yScalePE}
            tickFormat={(v) => formatarNumeroCompacto(Number(v))}
            tickLabelProps={() => ({ fill: "var(--muted-foreground)", fontSize: 11, textAnchor: "end", dx: -4, dy: 4 })}
            hideAxisLine
            hideTicks
          />
          <AxisRight
            left={larguraInterna}
            scale={yScaleMc}
            tickFormat={(v) => formatarPercentual(Number(v))}
            tickLabelProps={() => ({ fill: "var(--muted-foreground)", fontSize: 11, textAnchor: "start", dx: 4, dy: 4 })}
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
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#4C7DF0]" />
              <span className="text-white/70">Ponto de equilíbrio</span>
              <span className="ml-auto font-bold tabular-nums">{formatarMoeda(tooltipData.pontoEquilibrio)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#0FA37E]" />
              <span className="text-white/70">Margem de contribuição %</span>
              <span className="ml-auto font-bold tabular-nums">{formatarPercentual(tooltipData.margemContribuicaoPercentual)}</span>
            </div>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export function EvolucaoPontoEquilibrioChart({ dados, altura = 320 }: { dados: PontoEvolucaoPE[]; altura?: number }) {
  const semDado = dados.every((d) => d.pontoEquilibrio === 0 && d.margemContribuicaoPercentual === 0);

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
      <div className="mt-1 flex items-center gap-4 text-[11px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#4C7DF0]" /> Ponto de equilíbrio
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#0FA37E]" /> Margem de contribuição %
        </span>
      </div>
    </div>
  );
}
