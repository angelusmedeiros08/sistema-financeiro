"use client";

import { useState } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { LinePath, Line } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import type { PontoSerieSaldo } from "@/lib/relatorios/saldo-projetado";
import { Table } from "@phosphor-icons/react";
import { formatarMoeda, formatarNumeroAbreviado } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

type Serie = "realizado" | "projetado";

const MARGEM = { top: 20, right: 12, bottom: 24, left: 52 };

function rotuloDias(dias: number): string {
  if (dias === 0) return "Hoje";
  return dias < 0 ? `${dias}d` : `+${dias}d`;
}

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

// Motor trocado de Recharts pra @visx/shape — realizado sólido e
// projetado tracejado com `defined` cortando o traço onde o valor é
// null (LinePath.defined faz o mesmo que connectNulls={false} do
// Recharts), linha de referência "hoje" e colchão mínimo desenhadas à
// mão em vez de <ReferenceLine>.
function GraficoInterno({
  pontos,
  limiar,
  ocultas,
  largura,
  altura,
}: {
  pontos: PontoSerieSaldo[];
  limiar: number;
  ocultas: Set<Serie>;
  largura: number;
  altura: number;
}) {
  const [hoverIndice, setHoverIndice] = useState<number | null>(null);
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<PontoSerieSaldo>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ scroll: true, detectBounds: true });

  const larguraInterna = Math.max(largura - MARGEM.left - MARGEM.right, 10);
  const alturaInterna = Math.max(altura - MARGEM.top - MARGEM.bottom, 10);

  const valores = pontos.flatMap((p) => [p.realizado, p.projetado]).filter((v): v is number => v !== null);
  if (limiar > 0) valores.push(limiar);

  const xScale = scaleLinear<number>({
    domain: [Math.min(...pontos.map((p) => p.dias)), Math.max(...pontos.map((p) => p.dias))],
    range: [0, larguraInterna],
  });
  const yScale = scaleLinear<number>({ domain: [Math.min(0, ...valores), Math.max(...valores, 1)], range: [alturaInterna, 0], nice: true });

  function aoMoverMouse(evento: React.MouseEvent) {
    const coords = localPoint(evento);
    if (!coords) return;
    const diasAlvo = xScale.invert(coords.x - MARGEM.left);
    let melhorIndice = 0;
    let melhorDist = Infinity;
    pontos.forEach((p, i) => {
      const dist = Math.abs(p.dias - diasAlvo);
      if (dist < melhorDist) {
        melhorDist = dist;
        melhorIndice = i;
      }
    });
    setHoverIndice(melhorIndice);
    showTooltip({ tooltipData: pontos[melhorIndice], tooltipLeft: coords.x, tooltipTop: coords.y });
  }

  function aoSairMouse() {
    setHoverIndice(null);
    hideTooltip();
  }

  const pontoHover = hoverIndice !== null ? pontos[hoverIndice] : null;
  const xHover = pontoHover ? xScale(pontoHover.dias) : null;

  return (
    <div ref={containerRef} className="relative">
      <svg width={largura} height={altura} role="img" aria-label="Saldo projetado: realizado até hoje e projeção pros próximos dias.">
        <Group left={MARGEM.left} top={MARGEM.top}>
          <GridRows scale={yScale} width={larguraInterna} stroke="var(--border)" />

          {limiar > 0 && (
            <>
              <Line
                from={{ x: 0, y: yScale(limiar) }}
                to={{ x: larguraInterna, y: yScale(limiar) }}
                stroke="var(--destructive)"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
              <text x={2} y={yScale(limiar) - 5} fontSize={10} fontWeight={600} fill="var(--destructive)">
                Colchão mínimo
              </text>
            </>
          )}
          <Line from={{ x: xScale(0), y: 0 }} to={{ x: xScale(0), y: alturaInterna }} stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" />

          {!ocultas.has("realizado") && (
            <LinePath
              data={pontos}
              defined={(p) => p.realizado !== null}
              x={(p) => xScale(p.dias)}
              y={(p) => yScale(p.realizado ?? 0)}
              stroke="var(--positivo)"
              strokeWidth={2.25}
              curve={curveMonotoneX}
            />
          )}
          {!ocultas.has("projetado") && (
            <LinePath
              data={pontos}
              defined={(p) => p.projetado !== null}
              x={(p) => xScale(p.dias)}
              y={(p) => yScale(p.projetado ?? 0)}
              stroke="#4C7DF0"
              strokeWidth={2.25}
              strokeDasharray="5 4"
              curve={curveMonotoneX}
            />
          )}

          {xHover !== null && pontoHover && (
            <>
              <Line from={{ x: xHover, y: 0 }} to={{ x: xHover, y: alturaInterna }} stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" />
              {!ocultas.has("realizado") && pontoHover.realizado !== null && (
                <circle cx={xHover} cy={yScale(pontoHover.realizado)} r={4} fill="var(--positivo)" stroke="var(--card)" strokeWidth={2} />
              )}
              {!ocultas.has("projetado") && pontoHover.projetado !== null && (
                <circle cx={xHover} cy={yScale(pontoHover.projetado)} r={4} fill="#4C7DF0" stroke="var(--card)" strokeWidth={2} />
              )}
            </>
          )}

          <AxisLeft
            scale={yScale}
            tickFormat={(v) => formatarNumeroAbreviado(Number(v))}
            tickLabelProps={() => ({ fill: "var(--muted-foreground)", fontSize: 11, textAnchor: "end", dx: -4, dy: 4 })}
            hideAxisLine
            hideTicks
          />
          <AxisBottom
            top={alturaInterna}
            scale={xScale}
            tickFormat={(v) => rotuloDias(Number(v))}
            tickLabelProps={() => ({ fill: "var(--muted-foreground)", fontSize: 11, textAnchor: "middle" })}
            hideAxisLine
            tickStroke="var(--border)"
          />

          <rect width={larguraInterna} height={alturaInterna} fill="transparent" onMouseMove={aoMoverMouse} onMouseLeave={aoSairMouse} />
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipInPortal left={tooltipLeft} top={tooltipTop} style={estiloTooltip}>
          <div className="mb-1 font-semibold text-white/60">{rotuloDias(tooltipData.dias)}</div>
          <div className="flex flex-col gap-1">
            {!ocultas.has("realizado") && tooltipData.realizado !== null && (
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-positivo" />
                <span className="text-white/70">Realizado</span>
                <span className="ml-auto font-bold tabular-nums">{formatarMoeda(tooltipData.realizado)}</span>
              </div>
            )}
            {!ocultas.has("projetado") && tooltipData.projetado !== null && (
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#4C7DF0]" />
                <span className="text-white/70">Projetado</span>
                <span className="ml-auto font-bold tabular-nums">{formatarMoeda(tooltipData.projetado)}</span>
              </div>
            )}
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export function SaldoProjetadoChart({ pontos, limiar }: { pontos: PontoSerieSaldo[]; limiar: number }) {
  const [ocultas, setOcultas] = useState<Set<Serie>>(new Set());
  const [comoTabela, setComoTabela] = useState(false);

  function aoClicar(serie: Serie) {
    setOcultas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(serie)) proximo.delete(serie);
      else proximo.add(serie);
      if (proximo.size === 2) proximo.delete(serie);
      return proximo;
    });
  }

  function aoIsolar(serie: Serie) {
    setOcultas((atual) => {
      const jaIsolada = atual.size === 1 && !atual.has(serie);
      if (jaIsolada) return new Set();
      const outras: Serie[] = (["realizado", "projetado"] as Serie[]).filter((s) => s !== serie);
      return new Set(outras);
    });
  }

  return (
    <div>
      {comoTabela ? (
        <div className="max-h-[220px] overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-1.5 font-medium">Dia</th>
                <th className="px-2 py-1.5 text-right font-medium">Realizado</th>
                <th className="px-2 py-1.5 text-right font-medium">Projetado</th>
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={p.dias} className="border-b border-border last:border-none">
                  <td className="px-2 py-1.5">{rotuloDias(p.dias)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{p.realizado !== null ? formatarMoeda(p.realizado) : "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{p.projetado !== null ? formatarMoeda(p.projetado) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height: 220 }}>
          <ParentSize>
            {({ width }) => (width > 0 ? <GraficoInterno pontos={pontos} limiar={limiar} ocultas={ocultas} largura={width} altura={220} /> : null)}
          </ParentSize>
        </div>
      )}
      <div className="mt-1 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-[11px] font-medium text-muted-foreground">
          <button
            type="button"
            onClick={() => aoClicar("realizado")}
            onDoubleClick={() => aoIsolar("realizado")}
            className={cn("flex items-center gap-1.5 transition-opacity", ocultas.has("realizado") && "opacity-40")}
          >
            <span className="h-[2px] w-4 rounded-full bg-positivo" /> Realizado
          </button>
          <button
            type="button"
            onClick={() => aoClicar("projetado")}
            onDoubleClick={() => aoIsolar("projetado")}
            className={cn("flex items-center gap-1.5 transition-opacity", ocultas.has("projetado") && "opacity-40")}
          >
            <span
              className="h-[2px] w-4 rounded-full"
              style={{ backgroundImage: "repeating-linear-gradient(90deg,#4C7DF0 0 4px,transparent 4px 7px)" }}
            />
            Projetado
          </button>
        </div>
        <button
          type="button"
          onClick={() => setComoTabela((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          <Table size={12} />
          {comoTabela ? "Ver gráfico" : "Ver como tabela"}
        </button>
      </div>
    </div>
  );
}
