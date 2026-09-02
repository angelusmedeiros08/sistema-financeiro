"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scalePoint } from "@visx/scale";
import { AreaClosed, LinePath, Line } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { AxisBottom } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { Table } from "@phosphor-icons/react";
import type { PontoFluxo } from "@/app/(app)/painel/dados";
import { formatarMoeda, formatarPercentual } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

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

type Serie = "receitas" | "despesas";
type HrefsPonto = { receitas: string; despesas: string };

// Motor trocado de Recharts (ComposedChart) pra @visx/shape — mesma
// composição visual (duas áreas sobrepostas, curva suave, linha-guia
// pontilhada no hover), mas a interação agora é uma faixa de hover
// contínua (não só pontos discretos) e o tooltip é @visx/tooltip, igual
// ao resto dos gráficos já migrados (waterfall, comparativos, gauges).
function GraficoInterno({
  dados,
  hrefsPorMes,
  ocultas,
  largura,
  altura,
}: {
  dados: PontoFluxo[];
  hrefsPorMes?: HrefsPonto[];
  ocultas: Set<Serie>;
  largura: number;
  altura: number;
}) {
  const router = useRouter();
  const [hoverIndice, setHoverIndice] = useState<number | null>(null);
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<{ ponto: PontoFluxo; indice: number }>();
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
    showTooltip({ tooltipData: { ponto: dados[indice], indice }, tooltipLeft: coords.x, tooltipTop: coords.y });
  }

  function aoSairMouse() {
    setHoverIndice(null);
    hideTooltip();
  }

  // O <rect> de hover fica por cima dos círculos na ordem de pintura do SVG
  // (precisa vir depois pra capturar mousemove no gráfico inteiro), então é
  // ele quem tem que tratar o clique — um onClick só nos círculos nunca
  // dispara, o rect intercepta antes (achado ao vivo: clique num ponto não
  // levava pra lançamentos). Navega pra série (receita/despesa) mais perto
  // do Y clicado dentre as visíveis.
  function aoClicar(evento: React.MouseEvent) {
    const coords = localPoint(evento);
    if (!coords || dados.length === 0 || !hrefsPorMes) return;
    const passo = larguraInterna / Math.max(dados.length - 1, 1);
    const indice = Math.max(0, Math.min(dados.length - 1, Math.round((coords.x - MARGEM.left) / passo)));
    const href = hrefsPorMes[indice];
    if (!href) return;
    const ponto = dados[indice];
    const yClique = coords.y - MARGEM.top;
    const candidatas = (["receitas", "despesas"] as Serie[])
      .filter((s) => !ocultas.has(s))
      .map((s) => ({ serie: s, dist: Math.abs(yScale(ponto[s]) - yClique) }))
      .sort((a, b) => a.dist - b.dist);
    if (candidatas.length > 0) router.push(href[candidatas[0].serie]);
  }

  const pontoHover = hoverIndice !== null ? dados[hoverIndice] : null;
  const xHover = pontoHover ? (xScale(pontoHover.mes) ?? null) : null;
  const hrefHover = hoverIndice !== null ? hrefsPorMes?.[hoverIndice] : undefined;
  const anteriorHover = hoverIndice !== null && hoverIndice > 0 ? dados[hoverIndice - 1] : null;

  function variacao(atual: number, anterior: number | undefined): number | null {
    if (anterior === undefined || anterior === 0) return null;
    return (atual - anterior) / Math.abs(anterior);
  }

  return (
    <div ref={containerRef} className="relative">
      <svg
        width={largura}
        height={altura}
        role="img"
        aria-label={`Gráfico de fluxo de caixa: receitas e despesas por mês, últimos ${dados.length} meses.`}
      >
        <defs>
          <linearGradient id="fluxoReceitas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--positivo)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--positivo)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fluxoDespesas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Group left={MARGEM.left} top={MARGEM.top}>
          <GridRows scale={yScale} width={larguraInterna} stroke="var(--border)" />

          {!ocultas.has("despesas") && (
            <>
              <AreaClosed
                data={dados}
                x={(d) => xScale(d.mes) ?? 0}
                y={(d) => yScale(d.despesas)}
                yScale={yScale}
                fill="url(#fluxoDespesas)"
                curve={curveMonotoneX}
              />
              {/* Tracejado: única diferença visual entre as 2 séries além da cor
                  (WCAG 1.4.1 — cor nunca pode ser o único jeito de diferenciar). */}
              <LinePath
                data={dados}
                x={(d) => xScale(d.mes) ?? 0}
                y={(d) => yScale(d.despesas)}
                stroke="var(--destructive)"
                strokeWidth={2.25}
                strokeDasharray="6 4"
                curve={curveMonotoneX}
              />
            </>
          )}

          {!ocultas.has("receitas") && (
            <>
              <AreaClosed
                data={dados}
                x={(d) => xScale(d.mes) ?? 0}
                y={(d) => yScale(d.receitas)}
                yScale={yScale}
                fill="url(#fluxoReceitas)"
                curve={curveMonotoneX}
              />
              <LinePath data={dados} x={(d) => xScale(d.mes) ?? 0} y={(d) => yScale(d.receitas)} stroke="var(--positivo)" strokeWidth={2.25} curve={curveMonotoneX} />
            </>
          )}

          {xHover !== null && pontoHover && (
            <>
              <Line from={{ x: xHover, y: 0 }} to={{ x: xHover, y: alturaInterna }} stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" />
              {!ocultas.has("receitas") && (
                <circle cx={xHover} cy={yScale(pontoHover.receitas)} r={5} fill="var(--positivo)" stroke="var(--card)" strokeWidth={2} />
              )}
              {!ocultas.has("despesas") && (
                <circle cx={xHover} cy={yScale(pontoHover.despesas)} r={5} fill="var(--destructive)" stroke="var(--card)" strokeWidth={2} />
              )}
            </>
          )}

          <AxisBottom
            top={alturaInterna}
            scale={xScale}
            tickLabelProps={() => ({ fill: "var(--muted-foreground)", fontSize: 11, textAnchor: "middle" })}
            hideAxisLine
            tickStroke="var(--border)"
          />

          <rect
            width={larguraInterna}
            height={alturaInterna}
            fill="transparent"
            style={{ cursor: hrefsPorMes ? "pointer" : "default" }}
            onMouseMove={aoMoverMouse}
            onMouseLeave={aoSairMouse}
            onClick={aoClicar}
          />
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipInPortal left={tooltipLeft} top={tooltipTop} style={estiloTooltip}>
          <div className="mb-1 font-semibold text-white/60">{tooltipData.ponto.mes}</div>
          <div className="flex flex-col gap-1">
            {!ocultas.has("receitas") && (
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-positivo" />
                <span className="text-white/70">Receitas</span>
                <span className="ml-auto font-bold tabular-nums">{formatarMoeda(tooltipData.ponto.receitas)}</span>
                {(() => {
                  const v = variacao(tooltipData.ponto.receitas, anteriorHover?.receitas);
                  return v !== null ? (
                    <span className={cn("tabular-nums", v >= 0 ? "text-positivo" : "text-destructive")}>
                      {v >= 0 ? "+" : ""}
                      {formatarPercentual(v)}
                    </span>
                  ) : null;
                })()}
              </div>
            )}
            {!ocultas.has("despesas") && (
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-destructive" />
                <span className="text-white/70">Despesas</span>
                <span className="ml-auto font-bold tabular-nums">{formatarMoeda(tooltipData.ponto.despesas)}</span>
                {(() => {
                  const v = variacao(tooltipData.ponto.despesas, anteriorHover?.despesas);
                  return v !== null ? (
                    <span className={cn("tabular-nums", v <= 0 ? "text-positivo" : "text-destructive")}>
                      {v >= 0 ? "+" : ""}
                      {formatarPercentual(v)}
                    </span>
                  ) : null;
                })()}
              </div>
            )}
            {hrefHover && <div className="mt-0.5 text-[11px] text-white/40">Clique num ponto pra ver os lançamentos</div>}
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export function FluxoChart({ dados, hrefsPorMes, apresentacao = false }: { dados: PontoFluxo[]; hrefsPorMes?: HrefsPonto[]; apresentacao?: boolean }) {
  const semMovimento = dados.every((d) => d.receitas === 0 && d.despesas === 0);
  const [ocultas, setOcultas] = useState<Set<Serie>>(new Set());
  const [comoTabela, setComoTabela] = useState(false);

  function aoClicarLegenda(serie: Serie) {
    setOcultas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(serie)) proximo.delete(serie);
      else proximo.add(serie);
      // Nunca esconder as 2 — sem gráfico nenhum pra mostrar não ajuda ninguém.
      if (proximo.size === 2) proximo.delete(serie);
      return proximo;
    });
  }

  function aoIsolarLegenda(serie: Serie) {
    setOcultas((atual) => {
      const jaIsolada = atual.size === 1 && !atual.has(serie);
      if (jaIsolada) return new Set();
      const outras: Serie[] = (["receitas", "despesas"] as Serie[]).filter((s) => s !== serie);
      return new Set(outras);
    });
  }

  return (
    <div className={cn(apresentacao && "flex min-h-0 flex-1 flex-col")}>
      {/* Legenda fica FORA do ParentSize de propósito: o wrapper interno
          dele é position:absolute + overflow:hidden do tamanho exato do
          container, então qualquer coisa renderizada depois do <svg> ali
          dentro (a legenda, no caso) fica cortada em silêncio — sem erro,
          sem warning, só some.

          Em apresentação, a altura vem de `h-full` (o slide inteiro, via
          FocoApresentacao) em vez do 220px fixo do card normal — ParentSize
          já mede largura E altura reais do container, só não usávamos a
          altura antes porque o card sempre tinha um valor fixo mesmo.

          O `flex` aqui (além do `flex-1`) não é decoração: `flex-1` dá
          altura real a ESTA div, mas `align-items:stretch` (o padrão de um
          `display:flex`) só estica um filho cuja altura já é `auto` — o
          próprio ParentSize (@visx/responsive) põe `height:100%` inline no
          filho dele, um valor EXPLÍCITO, que por definição desliga o
          stretch. Sem forçar esse filho de volta pra `auto` (`[&>div]:h-auto!`
          — só alcança o filho direto, não entra nos elementos do próprio
          FluxoChart), o `height:100%` dele nunca resolvia (achado inspecionando
          o DOM ao vivo: media 0 mesmo com todo o resto da cadeia medindo
          certo). */}
      {comoTabela ? (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-1.5 font-medium">Mês</th>
                <th className="px-2 py-1.5 text-right font-medium">Receitas</th>
                <th className="px-2 py-1.5 text-right font-medium">Despesas</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((d) => (
                <tr key={d.chaveIso} className="border-b border-border last:border-none">
                  <td className="px-2 py-1.5 capitalize">{d.mes}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatarMoeda(d.receitas)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatarMoeda(d.despesas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={cn("relative", apresentacao ? "flex min-h-0 flex-1 [&>div]:h-auto!" : "h-[220px]")}>
          <ParentSize>
            {({ width, height }) => {
              const alturaUsavel = apresentacao ? height : 220;
              return width > 0 && alturaUsavel > 0 ? (
                <GraficoInterno dados={dados} hrefsPorMes={hrefsPorMes} ocultas={ocultas} largura={width} altura={alturaUsavel} />
              ) : null;
            }}
          </ParentSize>
          {semMovimento && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Ainda sem movimentação suficiente para o gráfico.
            </p>
          )}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-[11px] font-medium text-muted-foreground">
          <button
            type="button"
            onClick={() => aoClicarLegenda("receitas")}
            onDoubleClick={() => aoIsolarLegenda("receitas")}
            className={cn("flex items-center gap-1.5 transition-opacity", ocultas.has("receitas") && "opacity-40")}
          >
            <span className="size-2 rounded-full bg-positivo" /> Receitas
          </button>
          <button
            type="button"
            onClick={() => aoClicarLegenda("despesas")}
            onDoubleClick={() => aoIsolarLegenda("despesas")}
            className={cn("flex items-center gap-1.5 transition-opacity", ocultas.has("despesas") && "opacity-40")}
          >
            <span className="size-2 rounded-full bg-destructive" /> Despesas
          </button>
        </div>
        {!apresentacao && (
          <button
            type="button"
            onClick={() => setComoTabela((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <Table size={12} />
            {comoTabela ? "Ver gráfico" : "Ver como tabela"}
          </button>
        )}
      </div>
    </div>
  );
}
