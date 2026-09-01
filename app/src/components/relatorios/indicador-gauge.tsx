"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { formatarMesAbreviado, formatarPercentual } from "@/lib/formatacao";
import { Sparkline } from "@/components/painel/sparkline";

// Motor trocado de Recharts (RadialBarChart) pra @visx/shape (Pie) — o
// mesmo motor já usado no donut de categorias (top-categorias-donut.tsx),
// não o mesmo componente só com traço mais grosso. Rosca em 2 fatias
// (realizado + resto) com gap entre elas e pontas arredondadas, sem
// número dentro do anel — o percentual vira item de legenda (bolinha +
// número em negrito) do lado, no mesmo padrão da referência Taskcore.
const ZONAS_PADRAO = [
  { ate: 0.4, cor: "var(--destructive)" },
  { ate: 0.7, cor: "#E3A62F" },
  { ate: 1, cor: "var(--positivo)" },
] as const;

const ZONAS_INVERTIDAS = [
  { ate: 0.3, cor: "var(--positivo)" },
  { ate: 0.65, cor: "#E3A62F" },
  { ate: 1, cor: "var(--destructive)" },
] as const;

function corDaZona(valor: number, invertido: boolean): string {
  const zonas = invertido ? ZONAS_INVERTIDAS : ZONAS_PADRAO;
  return (zonas.find((z) => valor <= z.ate) ?? zonas[zonas.length - 1]).cor;
}

const RAIO = 32;
const ESPESSURA = 13;

export type PontoSerieGauge = { mes: string; valor: number };

export function IndicadorGauge({
  rotulo,
  valor,
  invertido = false,
  serie,
  href,
}: {
  rotulo: string;
  valor: number;
  invertido?: boolean;
  serie?: PontoSerieGauge[];
  // Card vira link pra Contas a Receber/Pagar — mesmo padrão de `StatCard`.
  href?: string;
}) {
  const percentualClamp = Math.max(0, Math.min(1, valor));
  const cor = corDaZona(percentualClamp, invertido);
  const temSerie = serie && serie.length > 1;

  const fatias = [
    { chave: "valor", total: percentualClamp, cor },
    { chave: "resto", total: 1 - percentualClamp, cor: "var(--muted)" },
  ];

  const conteudo = (
    <>
      <svg width={72} height={72} className="shrink-0" role="img" aria-label={`${rotulo}: ${Math.round(percentualClamp * 100)}%`}>
        <Group top={36} left={36}>
          <Pie
            data={fatias}
            pieValue={(f) => f.total}
            pieSort={null}
            pieSortValues={null}
            outerRadius={RAIO}
            innerRadius={RAIO - ESPESSURA}
            cornerRadius={5}
            padAngle={0.05}
            startAngle={-Math.PI / 2}
            endAngle={(3 * Math.PI) / 2}
          >
            {(pie) =>
              pie.arcs.map((arco) => (
                <path
                  key={arco.data.chave}
                  d={pie.path(arco) ?? undefined}
                  fill={arco.data.cor}
                  style={{ transition: "d 0.4s ease-out" }}
                />
              ))
            }
          </Pie>
        </Group>
      </svg>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full" style={{ background: cor }} />
          <span className="text-lg font-bold tabular-nums text-foreground">{formatarPercentual(percentualClamp)}</span>
        </div>
        <span className="mt-0.5 block text-xs font-medium text-muted-foreground">{rotulo}</span>
      </div>

      {temSerie && (
        <div className="hidden w-28 shrink-0 sm:block">
          <div className="h-10">
            <Sparkline dados={serie.map((p) => p.valor)} cor={cor} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-medium text-muted-foreground">
            <span>{formatarMesAbreviado(serie[0].mes)}</span>
            <span>{formatarMesAbreviado(serie[serie.length - 1].mes)}</span>
          </div>
        </div>
      )}

      {href && (
        <ArrowRight
          size={14}
          weight="bold"
          className="absolute right-3 bottom-3 text-muted-foreground opacity-0 transition-opacity group-hover/gauge:opacity-100 group-focus-visible/gauge:opacity-100"
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="group/gauge relative flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card transition-shadow hover:shadow-lg">
        {conteudo}
      </Link>
    );
  }

  return <div className="group/gauge relative flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card">{conteudo}</div>;
}
