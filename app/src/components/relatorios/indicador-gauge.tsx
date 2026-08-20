"use client";

import { Arc } from "@visx/shape";
import { formatarPercentual } from "@/lib/formatacao";

// Zonas fixas (vermelho/âmbar/verde) — "invertido" troca qual direção é
// boa: %Realizado é melhor quanto MAIOR, %Pago em atraso é melhor quanto
// MENOR. Arco de 180° via @visx/shape (Arc) — evolução do medidor linear
// original pro padrão de gauge circular que a pesquisa aponta como mais
// comercial (Mercury/Stripe), mantendo as mesmas zonas de cor.
const ZONAS_PADRAO = [
  { ate: 0.4, cor: "#B23A2E" },
  { ate: 0.7, cor: "#E3A62F" },
  { ate: 1, cor: "#0FA37E" },
] as const;

const ZONAS_INVERTIDAS = [
  { ate: 0.3, cor: "#0FA37E" },
  { ate: 0.65, cor: "#E3A62F" },
  { ate: 1, cor: "#B23A2E" },
] as const;

function corDaZona(valor: number, invertido: boolean): string {
  const zonas = invertido ? ZONAS_INVERTIDAS : ZONAS_PADRAO;
  return (zonas.find((z) => valor <= z.ate) ?? zonas[zonas.length - 1]).cor;
}

const RAIO_EXTERNO = 42;
const ESPESSURA = 9;
const ANGULO_INICIO = -Math.PI / 2;
const ANGULO_FIM = Math.PI / 2;

export function IndicadorGauge({
  rotulo,
  valor,
  invertido = false,
}: {
  rotulo: string;
  valor: number;
  invertido?: boolean;
}) {
  const percentualClamp = Math.max(0, Math.min(1, valor));
  const cor = corDaZona(percentualClamp, invertido);
  const anguloValor = ANGULO_INICIO + (ANGULO_FIM - ANGULO_INICIO) * percentualClamp;

  return (
    <div className="flex flex-col items-center rounded-2xl bg-card p-4 shadow-card">
      <span className="mb-1 self-start text-xs font-semibold text-muted-foreground">{rotulo}</span>
      <svg width="100%" height={62} viewBox="-48 -48 96 56" className="max-w-[180px]">
        <Arc
          startAngle={ANGULO_INICIO}
          endAngle={ANGULO_FIM}
          innerRadius={RAIO_EXTERNO - ESPESSURA}
          outerRadius={RAIO_EXTERNO}
          cornerRadius={4}
          fill="var(--muted)"
        />
        <Arc
          startAngle={ANGULO_INICIO}
          endAngle={anguloValor}
          innerRadius={RAIO_EXTERNO - ESPESSURA}
          outerRadius={RAIO_EXTERNO}
          cornerRadius={4}
          fill={cor}
          style={{ transition: "fill 0.4s ease" }}
        />
        <text x={0} y={-2} textAnchor="middle" fontSize={17} fontWeight={700} fill="var(--foreground)" className="tabular-nums">
          {formatarPercentual(percentualClamp)}
        </text>
      </svg>
    </div>
  );
}
