"use client";

import { Arc } from "@visx/shape";
import { formatarPercentual } from "@/lib/formatacao";
import { Sparkline } from "@/components/painel/sparkline";

// Zonas fixas (vermelho/âmbar/verde) — "invertido" troca qual direção é
// boa: %Realizado é melhor quanto MAIOR, %Pago em atraso é melhor quanto
// MENOR. Arco de 180° via @visx/shape (Arc), lado a lado com uma
// mini-tendência dos últimos períodos — padrão confirmado nas referências
// mandadas pelo usuário (cards de gauge colorido + sparkline juntos, não
// o indicador isolado sem contexto de evolução).
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
  serie,
}: {
  rotulo: string;
  valor: number;
  invertido?: boolean;
  serie?: number[];
}) {
  const percentualClamp = Math.max(0, Math.min(1, valor));
  const cor = corDaZona(percentualClamp, invertido);
  const anguloValor = ANGULO_INICIO + (ANGULO_FIM - ANGULO_INICIO) * percentualClamp;
  const temSerie = serie && serie.length > 1;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card">
      <svg width={88} height={52} viewBox="-48 -48 96 56" className="shrink-0">
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
        <text x={0} y={-2} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--foreground)" className="tabular-nums">
          {formatarPercentual(percentualClamp)}
        </text>
      </svg>

      <div className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-muted-foreground">{rotulo}</span>
        {temSerie && (
          <div className="-mx-1 mt-1.5 h-6">
            <Sparkline dados={serie} cor={cor} />
          </div>
        )}
      </div>
    </div>
  );
}
