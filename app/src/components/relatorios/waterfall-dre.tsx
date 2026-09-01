"use client";

import { useState } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleBand } from "@visx/scale";
import { Bar, Line } from "@visx/shape";
import { Group } from "@visx/group";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import type { Database } from "@/utils/supabase/database.types";
import { formatarMoeda, formatarNumeroAbreviado } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

type LinhaWaterfall = { rotulo: string; tipoCalc: Database["public"]["Enums"]["tipo_linha_dre"]; valorDireto: number };

type TipoBarraWaterfall = "delta" | "checkpoint" | "final";

type BarraWaterfall = {
  rotulo: string;
  tipo: TipoBarraWaterfall;
  baixo: number;
  alto: number;
  // delta: a própria variação da linha. checkpoint/final: o acumulado até
  // ali — os dois cabem no mesmo campo porque nunca são lidos ao mesmo
  // tempo (o tipo já diz qual dos dois significados vale).
  valorMostrado: number;
  nivel: number;
};

// Waterfall via @visx/shape (Bar/Line/Group prontos, mas escala Y e eixo
// são só matemática nossa — visx não tem escala não-linear com sinal nem
// rótulo em 2 linhas prontos). Redesenho aprovado em mockup nesta sessão
// (2026-08-22): motivo de cada decisão abaixo.
//
// Linha FOLHA com valor zero (categoria sem lançamento no período) some
// do gráfico — antes toda linha da DRE virava barra, e é comum metade
// ficar zerada, só poluindo com rótulo "0" flutuante e nome de eixo sem
// necessidade. RESULTADO_NAO_OPERACIONAL nunca vira barra própria: é a
// soma só do bloco de linhas FOLHA desde o marcador anterior (ver
// calcularCascata em lib/relatorios/dre.ts), sempre redundante com as
// duas linhas de detalhe (Receitas/Despesas não operacionais) logo acima
// dela na cascata — e o motor antigo desenhava essa barra a partir do
// valor local da linha em vez do acumulado, então ela flutuava perto do
// zero, desconectada do nível de verdade da cascata (bug real, achado
// junto com o redesenho).
function montarBarras(linhas: LinhaWaterfall[]): BarraWaterfall[] {
  const idxUltimoNaoFolha = linhas.map((l) => l.tipoCalc !== "FOLHA").lastIndexOf(true);
  let acumulado = 0;
  const barras: BarraWaterfall[] = [];

  linhas.forEach((linha, i) => {
    if (linha.tipoCalc === "FOLHA") {
      if (linha.valorDireto === 0) return;
      const inicio = acumulado;
      acumulado += linha.valorDireto;
      barras.push({
        rotulo: linha.rotulo,
        tipo: "delta",
        baixo: Math.min(inicio, acumulado),
        alto: Math.max(inicio, acumulado),
        valorMostrado: linha.valorDireto,
        nivel: acumulado,
      });
      return;
    }
    if (linha.tipoCalc === "RESULTADO_NAO_OPERACIONAL") return;

    barras.push({
      rotulo: linha.rotulo,
      tipo: i === idxUltimoNaoFolha ? "final" : "checkpoint",
      baixo: Math.min(0, acumulado),
      alto: Math.max(0, acumulado),
      valorMostrado: acumulado,
      nivel: acumulado,
    });
  });

  return barras;
}

// Raiz quadrada com sinal em vez de escala linear — sem isso, uma única
// despesa bem maior que o resultado final (comum: custo fixo grande
// contra margem apertada) engole quase toda a altura do gráfico e reduz
// as barras de resultado a uma linha fina ilegível. Comprime a amplitude
// mantendo ordem e sinal; o rótulo em cada barra sempre mostra o valor
// real (não o comprimido), a leitura numérica exata não se perde.
function transformarY(v: number): number {
  return Math.sign(v) * Math.sqrt(Math.abs(v));
}

function quebrarRotulo(texto: string, maxCharsPorLinha: number): [string, string?] {
  const palavras = texto.split(" ");
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (tentativa.length > maxCharsPorLinha && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  if (linhas.length <= 2) return [linhas[0] ?? "", linhas[1]];
  return [linhas[0], linhas.slice(1).join(" ")];
}

function corBarra(barra: BarraWaterfall): { fill: string; stroke: string; fillOpacity: number; strokeWidth: number } {
  if (barra.tipo === "final")
    return { fill: "var(--primary)", stroke: "color-mix(in srgb, var(--primary) 80%, black)", fillOpacity: 1, strokeWidth: 2 };
  const positivo = barra.valorMostrado >= 0;
  if (barra.tipo === "checkpoint") {
    return positivo
      ? { fill: "var(--positivo)", stroke: "color-mix(in srgb, var(--positivo) 80%, black)", fillOpacity: 1, strokeWidth: 1.5 }
      : { fill: "var(--destructive)", stroke: "color-mix(in srgb, var(--destructive) 80%, black)", fillOpacity: 1, strokeWidth: 1.5 };
  }
  return positivo
    ? { fill: "var(--positivo)", stroke: "var(--positivo)", fillOpacity: 0.32, strokeWidth: 1 }
    : { fill: "var(--destructive)", stroke: "var(--destructive)", fillOpacity: 0.32, strokeWidth: 1 };
}

const MARGEM = { top: 24, right: 12, bottom: 54, left: 12 };

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
  const minV = Math.min(...todosValores);
  const maxV = Math.max(...todosValores);
  const minT = transformarY(minV);
  const maxT = transformarY(maxV);
  const y = (v: number) => (maxT === minT ? alturaInterna / 2 : alturaInterna - ((transformarY(v) - minT) / (maxT - minT)) * alturaInterna);

  const xScale = scaleBand<string>({
    domain: barras.map((b) => b.rotulo),
    range: [0, larguraInterna],
    padding: 0.28,
  });
  const bw = xScale.bandwidth();
  const maxCharsPorLinha = Math.max(7, Math.floor(bw / 5.6));

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
      <svg width={largura} height={altura} role="img" aria-label="DRE em cascata: composição do resultado por linha, do topo até o resultado final.">
        <Group left={MARGEM.left} top={MARGEM.top}>
          {Array.from({ length: 5 }, (_, i) => minV + ((maxV - minV) / 4) * i).map((v, i) => (
            <Line key={i} from={{ x: 0, y: y(v) }} to={{ x: larguraInterna, y: y(v) }} stroke="var(--border)" strokeWidth={1} />
          ))}
          <Line from={{ x: 0, y: y(0) }} to={{ x: larguraInterna, y: y(0) }} stroke="var(--border)" strokeWidth={1.5} />

          {barras.slice(0, -1).map((barra, i) => {
            const proxima = barras[i + 1];
            const xFim = (xScale(barra.rotulo) ?? 0) + bw;
            const xInicio = xScale(proxima.rotulo) ?? 0;
            const yNivel = y(barra.nivel);
            return (
              <Line
                key={`conector-${barra.rotulo}`}
                from={{ x: xFim, y: yNivel }}
                to={{ x: xInicio, y: yNivel }}
                stroke="var(--muted-foreground)"
                strokeDasharray="3 3"
                strokeWidth={1}
                opacity={0.55}
              />
            );
          })}

          {barras.map((barra, i) => {
            const x = xScale(barra.rotulo) ?? 0;
            const yTop = y(barra.alto);
            const h = Math.max(y(barra.baixo) - y(barra.alto), 2);
            const emHover = hoverIndice === i;
            const cor = corBarra(barra);
            const cx = x + bw / 2;
            const acimaDoZero = barra.valorMostrado >= 0;
            const rotuloValor = formatarNumeroAbreviado(barra.valorMostrado);

            return (
              <Group key={barra.rotulo}>
                <Bar
                  x={x}
                  y={yTop}
                  width={bw}
                  height={h}
                  rx={5}
                  fill={cor.fill}
                  fillOpacity={hoverIndice === null || emHover ? cor.fillOpacity : cor.fillOpacity * 0.55}
                  stroke={cor.stroke}
                  strokeWidth={cor.strokeWidth}
                  style={{ transition: "fill-opacity 0.15s ease" }}
                  onMouseMove={(e) => aoPassarMouse(e, barra, i)}
                  onMouseLeave={aoSairMouse}
                />
                {barra.tipo === "delta" ? (
                  <text
                    x={cx}
                    y={acimaDoZero ? Math.max(yTop - 8, 12) : Math.min(yTop + h + 14, alturaInterna - 6)}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill="var(--muted-foreground)"
                    pointerEvents="none"
                  >
                    {rotuloValor}
                  </text>
                ) : (
                  <text
                    x={cx}
                    y={yTop + h / 2 + 3.5}
                    textAnchor="middle"
                    fontSize={10.5}
                    fontWeight={800}
                    fill="#ffffff"
                    pointerEvents="none"
                  >
                    {rotuloValor}
                  </text>
                )}
              </Group>
            );
          })}
        </Group>

        <Group left={MARGEM.left} top={MARGEM.top + alturaInterna + 14}>
          {barras.map((barra, i) => {
            const cx = (xScale(barra.rotulo) ?? 0) + bw / 2;
            const [linha1, linha2] = quebrarRotulo(barra.rotulo, maxCharsPorLinha);
            const destaque = barra.tipo !== "delta";
            return (
              <text
                key={barra.rotulo}
                x={cx}
                y={0}
                textAnchor="middle"
                fontSize={10}
                fontWeight={destaque ? 800 : 600}
                fill={destaque ? "var(--foreground)" : "var(--muted-foreground)"}
              >
                <tspan x={cx} dy={0}>
                  {linha1}
                </tspan>
                {linha2 && (
                  <tspan x={cx} dy={12}>
                    {linha2}
                  </tspan>
                )}
              </text>
            );
          })}
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipInPortal left={tooltipLeft} top={tooltipTop} style={estiloTooltip}>
          <div className="font-semibold">{tooltipData.rotulo}</div>
          <div className="text-muted-foreground">
            {tooltipData.tipo === "delta" ? "Variação: " : "Acumulado: "}
            {formatarMoeda(tooltipData.valorMostrado)}
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

// Piso de largura por barra — sem isso, uma DRE com muitas linhas (a
// estrutura é configurável por tenant) espreme o bandwidth até o rótulo
// de 2 linhas não caber. Com o piso, o gráfico passa a rolar
// horizontalmente em vez de comprimir.
const LARGURA_MIN_POR_BARRA = 80;

// `apresentacao`: em vez do `altura` fixo (pensado pro card no meio do
// dashboard normal), a altura vira `flex-1` (cresce até o espaço que sobrar
// no slide, via FocoApresentacao) e o ParentSize mede a altura real do
// container — mesmo motivo/padrão do FluxoChart. `align-items:stretch` (o
// padrão de um `display:flex`) só estica um filho cuja altura é `auto` — o
// ParentSize (@visx/responsive) põe `height:100%` inline no filho dele, um
// valor EXPLÍCITO, que por definição desliga o stretch. `[&>div]:h-auto!`
// força esse filho de volta pra `auto` (só alcança o filho direto do
// ParentSize, não entra nos elementos do próprio WaterfallDre) — sem isso o
// `height:100%` dele nunca resolvia (achado inspecionando o DOM ao vivo: a
// altura media 0 mesmo com o container pai medindo certo). `altura`
// continua valendo como piso enquanto a medição real ainda não chegou, pra
// não piscar vazio.
export function WaterfallDre({ linhas, altura = 420, apresentacao = false }: { linhas: LinhaWaterfall[]; altura?: number; apresentacao?: boolean }) {
  const barras = montarBarras(linhas);
  const semDado = linhas.length === 0 || linhas.every((l) => l.valorDireto === 0);

  return (
    <div className={cn("relative", apresentacao ? "flex min-h-0 flex-1 [&>div]:h-auto!" : undefined)} style={apresentacao ? undefined : { height: altura }}>
      {semDado ? (
        <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Sem movimentação no período selecionado.
        </p>
      ) : (
        <ParentSize>
          {({ width, height }) => {
            if (width <= 0) return null;
            const alturaUsavel = apresentacao ? height || altura : altura;
            if (alturaUsavel <= 0) return null;
            const larguraNecessaria = Math.max(width, barras.length * LARGURA_MIN_POR_BARRA + MARGEM.left + MARGEM.right);
            return (
              <div className="h-full overflow-x-auto">
                <GraficoInterno barras={barras} largura={larguraNecessaria} altura={alturaUsavel} />
              </div>
            );
          }}
        </ParentSize>
      )}
    </div>
  );
}
