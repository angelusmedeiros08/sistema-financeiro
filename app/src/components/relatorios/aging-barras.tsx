import { formatarMoeda, formatarNumeroCompacto } from "@/lib/formatacao";
import type { AgingResultado } from "@/lib/relatorios/aging";

// Barra horizontal com gradiente de severidade âmbar→coral (Seção 4.3 do
// spec) — usada resumida na Visão geral e por extenso no Aging Analítico.
// Faixas zeradas somem da lista pra não poluir quando o tenant está em dia.
const CORES_SEVERIDADE = ["#C98A1F", "#CE7C33", "#D46E47", "#D8613B", "#D8583A", "#D14A38", "#C93D37"];

export function AgingBarras({ titulo, dados }: { titulo: string; dados: AgingResultado }) {
  const faixas = dados.vencido.filter((f) => f.total > 0);
  const maior = Math.max(...faixas.map((f) => f.total), 1);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold text-foreground">{titulo}</h2>
        <span className="text-sm font-bold tabular-nums text-[#D8583A]">{formatarMoeda(dados.totalVencido)}</span>
      </div>

      {faixas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada vencido, tudo em dia.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {faixas.map((faixa, i) => (
            <div key={faixa.rotulo} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-muted-foreground">{faixa.rotulo}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(4, (faixa.total / maior) * 100)}%`, background: CORES_SEVERIDADE[i % CORES_SEVERIDADE.length] }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                {formatarNumeroCompacto(faixa.total)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
