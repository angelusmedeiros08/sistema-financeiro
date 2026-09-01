"use client";

import { useState } from "react";
import { scaleBand, scaleLinear } from "@visx/scale";
import { BarGroup } from "@visx/shape";
import { Group } from "@visx/group";
import { AxisBottom } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { ParentSize } from "@visx/responsive";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { Table } from "@phosphor-icons/react";
import { formatarMoeda } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

export type SerieComparativo = { chave: string; nome: string; cor: string };

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

type TooltipDado = { rotuloEixo: string; serie: SerieComparativo; valor: number };

// Motor trocado de Recharts (BarChart) pra @visx/shape (BarGroup) —
// mesmas barras agrupadas com pontas arredondadas, mesmo tooltip escuro,
// consistente com o resto dos gráficos já migrados.
function GraficoInterno({
  dados,
  eixoX,
  series,
  ocultas,
  titulo,
  largura,
  altura,
}: {
  dados: Record<string, number | string>[];
  eixoX: string;
  series: SerieComparativo[];
  ocultas: Set<string>;
  titulo: string;
  largura: number;
  altura: number;
}) {
  const seriesVisiveis = series.filter((s) => !ocultas.has(s.chave));
  const chaves = seriesVisiveis.map((s) => s.chave);
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<TooltipDado>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ scroll: true, detectBounds: true });

  const larguraInterna = Math.max(largura - MARGEM.left - MARGEM.right, 10);
  const alturaInterna = Math.max(altura - MARGEM.top - MARGEM.bottom, 10);

  const dadosComChave = dados.map((d) => ({ ...d, rotuloEixo: String(d[eixoX]) }));
  const x0Scale = scaleBand<string>({ domain: dadosComChave.map((d) => d.rotuloEixo), range: [0, larguraInterna], padding: 0.3 });
  const x1Scale = scaleBand<string>({ domain: chaves, range: [0, x0Scale.bandwidth()], padding: 0.15 });
  const todosValores = dados.flatMap((d) => chaves.map((k) => Number(d[k] ?? 0)));
  const yScale = scaleLinear<number>({
    domain: [Math.min(0, ...todosValores), Math.max(0, ...todosValores, 1)],
    range: [alturaInterna, 0],
    nice: true,
  });

  return (
    <div ref={containerRef} className="relative">
      <svg width={largura} height={altura} role="img" aria-label={titulo}>
        <Group left={MARGEM.left} top={MARGEM.top}>
          <GridRows scale={yScale} width={larguraInterna} stroke="var(--border)" />

          <BarGroup
            data={dadosComChave}
            keys={chaves}
            height={alturaInterna}
            x0={(d) => d.rotuloEixo}
            x0Scale={x0Scale}
            x1Scale={x1Scale}
            yScale={yScale}
            color={(chave) => series.find((s) => s.chave === chave)?.cor ?? "var(--muted-foreground)"}
          >
            {(barGroups) =>
              barGroups.map((barGroup) => (
                <Group key={`grupo-${barGroup.index}`} left={barGroup.x0}>
                  {barGroup.bars.map((bar) => {
                    // bar.y/bar.height do BarGroup assumem baseline no
                    // fundo do gráfico (height - yScale(valor)) — só bate
                    // pra valores sempre positivos. Recalcula em cima do
                    // yScale direto (linha do zero, não o fundo do SVG)
                    // pra series negativas (ex.: despesas) renderizarem.
                    //
                    // Piso de 2px de altura pra valor não-zero — mesma
                    // convenção de piso mínimo do TrilhoBarra. Sem isso, um
                    // dia com valor bem fora da curva (ex.: um pagamento
                    // avulso grande) comprime todo o resto da série a
                    // altura sub-pixel, invisível.
                    const yZero = yScale(0);
                    const yValor = yScale(bar.value);
                    const alturaReal = Math.abs(yZero - yValor);
                    const altura = bar.value === 0 ? 0 : Math.max(alturaReal, 2);
                    const y = bar.value >= 0 ? yZero - altura : yZero;
                    return (
                      <rect
                        key={bar.key}
                        x={bar.x}
                        y={y}
                        width={bar.width}
                        height={altura}
                        fill={bar.color}
                        rx={3}
                        style={{ transition: "opacity 0.15s ease" }}
                        onMouseMove={(evento) => {
                          const coords = localPoint(evento) ?? { x: 0, y: 0 };
                          const serie = series.find((s) => s.chave === bar.key);
                          if (!serie) return;
                          showTooltip({
                            tooltipData: { rotuloEixo: dadosComChave[barGroup.index].rotuloEixo, serie, valor: bar.value },
                            tooltipLeft: coords.x,
                            tooltipTop: coords.y,
                          });
                        }}
                        onMouseLeave={hideTooltip}
                      />
                    );
                  })}
                </Group>
              ))
            }
          </BarGroup>

          <AxisBottom
            top={alturaInterna}
            scale={x0Scale}
            tickLabelProps={() => ({ fill: "var(--muted-foreground)", fontSize: 11, textAnchor: "middle" })}
            hideAxisLine
            tickStroke="var(--border)"
          />
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipInPortal left={tooltipLeft} top={tooltipTop} style={estiloTooltip}>
          <div className="mb-1 font-semibold text-white/60">{tooltipData.rotuloEixo}</div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: tooltipData.serie.cor }} />
            <span className="text-white/70">{tooltipData.serie.nome}</span>
            <span className="ml-auto font-bold tabular-nums">{formatarMoeda(tooltipData.valor)}</span>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export function ComparativoBarras({
  dados,
  eixoX,
  series,
  titulo,
  altura = 300,
}: {
  dados: Record<string, number | string>[];
  eixoX: string;
  series: SerieComparativo[];
  titulo?: string;
  altura?: number;
}) {
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  const [comoTabela, setComoTabela] = useState(false);

  function aoClicar(chave: string) {
    setOcultas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(chave)) proximo.delete(chave);
      else proximo.add(chave);
      if (proximo.size === series.length) proximo.delete(chave);
      return proximo;
    });
  }

  function aoIsolar(chave: string) {
    setOcultas((atual) => {
      const jaIsolada = atual.size === series.length - 1 && !atual.has(chave);
      if (jaIsolada) return new Set();
      return new Set(series.map((s) => s.chave).filter((c) => c !== chave));
    });
  }

  return (
    <div>
      {comoTabela ? (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-1.5 font-medium capitalize">{eixoX}</th>
                {series.map((s) => (
                  <th key={s.chave} className="px-2 py-1.5 text-right font-medium">
                    {s.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.map((d, i) => (
                <tr key={i} className="border-b border-border last:border-none">
                  <td className="px-2 py-1.5">{String(d[eixoX])}</td>
                  {series.map((s) => (
                    <td key={s.chave} className="px-2 py-1.5 text-right tabular-nums">
                      {formatarMoeda(Number(d[s.chave] ?? 0))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height: altura }}>
          <ParentSize>
            {({ width }) =>
              width > 0 ? (
                <GraficoInterno
                  dados={dados}
                  eixoX={eixoX}
                  series={series}
                  ocultas={ocultas}
                  titulo={titulo ?? series.map((s) => s.nome).join(" vs. ")}
                  largura={width}
                  altura={altura}
                />
              ) : null
            }
          </ParentSize>
        </div>
      )}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-muted-foreground">
          {series.map((s) => (
            <button
              key={s.chave}
              type="button"
              onClick={() => aoClicar(s.chave)}
              onDoubleClick={() => aoIsolar(s.chave)}
              className={cn("flex items-center gap-1.5 transition-opacity", ocultas.has(s.chave) && "opacity-40")}
            >
              <span className="size-2 rounded-full" style={{ background: s.cor }} />
              {s.nome}
            </button>
          ))}
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
