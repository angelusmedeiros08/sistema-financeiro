import { formatarPercentual } from "@/lib/formatacao";

// Zonas fixas (vermelho/âmbar/verde) — "invertido" troca qual direção é
// boa: %Realizado é melhor quanto MAIOR, %Pago em atraso é melhor quanto
// MENOR. Estilo validado no companion de brainstorming (medidor linear
// com zonas), preferido a velocímetro circular.
const ZONAS_PADRAO = [
  { ate: 0.4, cor: "#D8583A" },
  { ate: 0.7, cor: "#C98A1F" },
  { ate: 1, cor: "#157F6B" },
] as const;

const ZONAS_INVERTIDAS = [
  { ate: 0.3, cor: "#157F6B" },
  { ate: 0.65, cor: "#C98A1F" },
  { ate: 1, cor: "#D8583A" },
] as const;

function corDaZona(valor: number, invertido: boolean): string {
  const zonas = invertido ? ZONAS_INVERTIDAS : ZONAS_PADRAO;
  return (zonas.find((z) => valor <= z.ate) ?? zonas[zonas.length - 1]).cor;
}

function fundoDasZonas(invertido: boolean): string {
  const zonas = invertido ? ZONAS_INVERTIDAS : ZONAS_PADRAO;
  const [z1, z2, z3] = zonas;
  return `linear-gradient(90deg, ${z1.cor} 0 ${z1.ate * 100}%, ${z2.cor} ${z1.ate * 100}% ${z2.ate * 100}%, ${z3.cor} ${z2.ate * 100}% 100%)`;
}

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

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{rotulo}</span>
        <span className="text-base font-bold tabular-nums" style={{ color: cor }}>
          {formatarPercentual(percentualClamp)}
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full">
        <div className="absolute inset-0 rounded-full" style={{ background: fundoDasZonas(invertido), opacity: 0.28 }} />
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${percentualClamp * 100}%`, background: cor }}
        />
      </div>
    </div>
  );
}
