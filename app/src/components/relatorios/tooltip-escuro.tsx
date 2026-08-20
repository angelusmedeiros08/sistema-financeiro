"use client";

type PayloadItem = {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
};

// Tooltip fixado num ponto com fundo escuro — padrão visto em quase toda
// referência comercial mandada pelo usuário (FiraCast, Prism, Taskcore):
// não é o tooltip claro padrão do Recharts, é uma caixa escura destacada
// com um ponto por série, sempre com a linha-guia pontilhada (via prop
// `cursor` do <Tooltip>, configurada em cada gráfico que usa isso).
export function TooltipEscuro({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string | number;
  labelFormatter?: (label: string | number) => string;
  valueFormatter?: (valor: number, nome?: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="min-w-32 rounded-xl bg-[#1A1D1F] px-3.5 py-2.5 text-xs text-white shadow-2xl">
      {label !== undefined && (
        <div className="mb-1.5 font-semibold text-white/60">{labelFormatter ? labelFormatter(label) : label}</div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entrada, i) => (
          <div key={`${entrada.dataKey}-${i}`} className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full" style={{ background: entrada.color }} />
            <span className="text-white/70">{entrada.name}</span>
            <span className="ml-auto shrink-0 font-bold tabular-nums">
              {valueFormatter && typeof entrada.value === "number" ? valueFormatter(entrada.value, entrada.name) : entrada.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
