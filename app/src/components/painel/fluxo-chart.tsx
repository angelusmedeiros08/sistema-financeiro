"use client";

import { useState } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scalePoint } from "@visx/scale";
import { AreaClosed, LinePath, Line } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { AxisBottom } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import type { PontoFluxo } from "@/app/(app)/painel/dados";
import { formatarMoeda } from "@/lib/formatacao";

const MARGEM = { top: 12, right: 8, bottom: 24, left: 8 };

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

// Motor trocado de Recharts (ComposedChart) pra @visx/shape — mesma
// composição visual (duas áreas sobrepostas, curva suave, linha-guia
// pontilhada no hover), mas a interação agora é uma faixa de hover
// contínua (não só pontos discretos) e o tooltip é @visx/tooltip, igual
// ao resto dos gráficos já migrados (waterfall, comparativos, gauges).
function GraficoInterno({ dados, largura, altura }: { dados: PontoFluxo[]; largura: number; altura: number }) {
  const [hoverIndice, setHoverIndice] = useState<number | null>(null);
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<PontoFluxo>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ scroll: true, detectBounds: true });

  const larguraInterna = Math.max(largura - MARGEM.left - MARGEM.right, 10);
  const alturaInterna = Math.max(altura - MARGEM.top - MARGEM.bottom, 10);

  const todosValores = dados.flatMap((d) => [d.receitas, d.despesas]);
  const yScale = scaleLinear<number>({ domain: [0, Math.max(...todosValores, 1)], range: [alturaInterna, 0], nice: true });
  const xScale = scalePoint<string>({ domain: dados.map((d) => d.mes), range: [0, larguraInterna], padding: 0.5 });

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
  const xHover = pontoHover ? (xScale(pontoHover.mes) ?? null) : null;

  return (
    <div ref={containerRef} className="relative">
      <svg width={largura} height={altura}>
        <defs>
          <linearGradient id="fluxoReceitas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0FA37E" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#0FA37E" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fluxoDespesas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B23A2E" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#B23A2E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Group left={MARGEM.left} top={MARGEM.top}>
          <GridRows scale={yScale} width={larguraInterna} stroke="var(--border)" />

          <AreaClosed
            data={dados}
            x={(d) => xScale(d.mes) ?? 0}
            y={(d) => yScale(d.despesas)}
            yScale={yScale}
            fill="url(#fluxoDespesas)"
            curve={curveMonotoneX}
          />
          <LinePath data={dados} x={(d) => xScale(d.mes) ?? 0} y={(d) => yScale(d.despesas)} stroke="#B23A2E" strokeWidth={2.25} curve={curveMonotoneX} />

          <AreaClosed
            data={dados}
            x={(d) => xScale(d.mes) ?? 0}
            y={(d) => yScale(d.receitas)}
            yScale={yScale}
            fill="url(#fluxoReceitas)"
            curve={curveMonotoneX}
          />
          <LinePath data={dados} x={(d) => xScale(d.mes) ?? 0} y={(d) => yScale(d.receitas)} stroke="#0FA37E" strokeWidth={2.25} curve={curveMonotoneX} />

          {xHover !== null && pontoHover && (
            <>
              <Line from={{ x: xHover, y: 0 }} to={{ x: xHover, y: alturaInterna }} stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={xHover} cy={yScale(pontoHover.receitas)} r={4} fill="#0FA37E" stroke="var(--card)" strokeWidth={2} />
              <circle cx={xHover} cy={yScale(pontoHover.despesas)} r={4} fill="#B23A2E" stroke="var(--card)" strokeWidth={2} />
            </>
          )}

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
          <div className="mb-1 font-semibold text-white/60">{tooltipData.mes}</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#0FA37E]" />
              <span className="text-white/70">Receitas</span>
              <span className="ml-auto font-bold tabular-nums">{formatarMoeda(tooltipData.receitas)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#B23A2E]" />
              <span className="text-white/70">Despesas</span>
              <span className="ml-auto font-bold tabular-nums">{formatarMoeda(tooltipData.despesas)}</span>
            </div>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export function FluxoChart({ dados }: { dados: PontoFluxo[] }) {
  const semMovimento = dados.every((d) => d.receitas === 0 && d.despesas === 0);

  return (
    <div>
      {/* Legenda fica FORA do ParentSize de propósito: o wrapper interno
          dele é position:absolute + overflow:hidden do tamanho exato do
          container, então qualquer coisa renderizada depois do <svg> ali
          dentro (a legenda, no caso) fica cortada em silêncio — sem erro,
          sem warning, só some. */}
      <div className="relative" style={{ height: 220 }}>
        <ParentSize>{({ width }) => (width > 0 ? <GraficoInterno dados={dados} largura={width} altura={220} /> : null)}</ParentSize>
        {semMovimento && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Ainda sem movimentação suficiente para o gráfico.
          </p>
        )}
      </div>
      <div className="mt-1 flex items-center gap-4 text-[11px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#0FA37E]" /> Receitas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#B23A2E]" /> Despesas
        </span>
      </div>
    </div>
  );
}
