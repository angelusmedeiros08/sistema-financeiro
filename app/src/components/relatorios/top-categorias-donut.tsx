"use client";

import { useState } from "react";
import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { formatarMoeda, formatarNumeroAbreviado, formatarPercentual } from "@/lib/formatacao";
import type { LinhaAnaliseCategoria } from "@/lib/relatorios/analise-despesas";

// Rosca com até 5 fatias + "Outras" agregando o resto — estilo validado no
// companion de brainstorming (preferido a ranking em barra e a treemap).
// Motor de desenho é @visx/shape (Pie) em vez de strokeDasharray calculado
// à mão. Tooltip por fatia via @visx/tooltip (hover realça a fatia e some
// as demais, sincronizado com a legenda ao lado).
const PALETA = ["#0FA37E", "#E3A62F", "#4C7DF0", "#B45FC7", "#8CB84A", "#EF6F9A"];
const RAIO = 70;
const ESPESSURA = 28;
const MAX_FATIAS_NOMEADAS = 5;
// Piso de 2% do total pro ângulo do arco — mesma convenção do piso de
// largura mínima do TrilhoBarra (usado em Aging/Orçado/CentroCusto). Sem
// isso, uma categoria dominando o total (comum: folha de pagamento) deixa
// as outras fatias com ângulo sub-pixel, invisíveis. Só o ÂNGULO é
// inflado — valor e percentual mostrados no tooltip/legenda continuam os
// reais, sem distorção.
const FRACAO_MINIMA_FATIA = 0.02;

type Fatia = { rotulo: string; total: number; cor: string };

function agregarFatias(linhas: LinhaAnaliseCategoria[]): Fatia[] {
  const ordenadas = [...linhas].sort((a, b) => b.total - a.total);
  const principais = ordenadas.slice(0, MAX_FATIAS_NOMEADAS);
  const resto = ordenadas.slice(MAX_FATIAS_NOMEADAS);
  const totalResto = resto.reduce((soma, l) => soma + l.total, 0);

  const fatias: Fatia[] = principais.map((linha, i) => ({ rotulo: linha.categoriaNome, total: linha.total, cor: PALETA[i] }));
  if (totalResto > 0) fatias.push({ rotulo: "Outras", total: totalResto, cor: PALETA[PALETA.length - 1] });
  return fatias;
}

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

export function TopCategoriasDonut({ titulo, linhas }: { titulo: string; linhas: LinhaAnaliseCategoria[] }) {
  const fatias = agregarFatias(linhas);
  const total = fatias.reduce((soma, f) => soma + f.total, 0);
  const [hoverIndice, setHoverIndice] = useState<number | null>(null);

  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<Fatia>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ scroll: true, detectBounds: true });

  function aoFecharHover() {
    setHoverIndice(null);
    hideTooltip();
  }

  return (
    <div className="rounded-2xl bg-card shadow-card p-5">
      <h2 className="mb-4 font-heading text-sm font-bold text-foreground">{titulo}</h2>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma movimentação no período selecionado.</p>
      ) : (
        <div ref={containerRef} className="relative flex flex-wrap items-center gap-6">
          <svg viewBox="0 0 200 200" width="170" height="170" className="shrink-0">
            <Group top={100} left={100}>
              <Pie
                data={fatias}
                pieValue={(f) => Math.max(f.total, total * FRACAO_MINIMA_FATIA)}
                outerRadius={RAIO}
                innerRadius={RAIO - ESPESSURA}
                padAngle={0.012}
              >
                {(pie) =>
                  pie.arcs.map((arc, i) => (
                    <path
                      key={arc.data.rotulo}
                      d={pie.path(arc) ?? undefined}
                      fill={arc.data.cor}
                      opacity={hoverIndice === null || hoverIndice === i ? 1 : 0.35}
                      style={{ transition: "opacity 0.15s ease", cursor: "pointer" }}
                      onMouseMove={(e) => {
                        const coords = localPoint(e) ?? { x: 0, y: 0 };
                        setHoverIndice(i);
                        showTooltip({ tooltipData: arc.data, tooltipLeft: coords.x, tooltipTop: coords.y });
                      }}
                      onMouseLeave={aoFecharHover}
                    />
                  ))
                }
              </Pie>
            </Group>
            {/* formatarNumeroAbreviado (não formatarNumeroCompacto) de propósito
                — o furo da rosca tem ~84 unidades de diâmetro, um total tipo
                "201.849.780,50" (sem abreviar) vaza muito pra fora disso;
                abreviado ("201,8 mi") sempre cabe, não importa a magnitude. */}
            <text x="100" y="96" textAnchor="middle" className="fill-foreground" fontSize="17" fontWeight="700">
              {formatarNumeroAbreviado(total)}
            </text>
            <text x="100" y="116" textAnchor="middle" className="fill-muted-foreground" fontSize="11">
              total
            </text>
          </svg>

          <ul className="flex min-w-40 flex-1 flex-col gap-2">
            {fatias.map((fatia, i) => (
              <li
                key={fatia.rotulo}
                onMouseEnter={() => setHoverIndice(i)}
                onMouseLeave={aoFecharHover}
                className={"flex cursor-default items-center gap-2 rounded-md px-1 py-0.5 text-xs transition-colors " + (hoverIndice === i ? "bg-muted" : "")}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: fatia.cor }} />
                <span className="flex-1 truncate text-muted-foreground">{fatia.rotulo}</span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">{formatarMoeda(fatia.total)}</span>
                <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">{formatarPercentual(fatia.total / total)}</span>
              </li>
            ))}
          </ul>

          {tooltipOpen && tooltipData && (
            <TooltipInPortal left={tooltipLeft} top={tooltipTop} style={estiloTooltip}>
              <div className="font-semibold">{tooltipData.rotulo}</div>
              <div className="text-muted-foreground">
                {formatarMoeda(tooltipData.total)} · {formatarPercentual(tooltipData.total / total)}
              </div>
            </TooltipInPortal>
          )}
        </div>
      )}
    </div>
  );
}
