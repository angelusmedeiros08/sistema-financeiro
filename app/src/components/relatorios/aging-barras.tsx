import { formatarMoeda, formatarNumeroCompacto } from "@/lib/formatacao";
import type { AgingResultado } from "@/lib/relatorios/aging";
import { TrilhoBarra } from "./trilho-barra";

// Barra horizontal com gradiente de severidade âmbar→vermelho (Seção 4.3 do
// spec) — usada resumida na Visão geral e por extenso no Aging Analítico.
// Faixas zeradas somem da lista pra não poluir quando o tenant está em dia.
// Termina no vermelho de erro (--destructive), não no terracota (--primary),
// pra não confundir "quanto mais vencido" com a cor de ação do sistema.
const CORES_SEVERIDADE = ["#C98A1F", "#CE7C33", "#D46E47", "#D0603B", "#C94A3D", "#B23A2E", "#8F2E24"];

export function AgingBarras({ titulo, dados }: { titulo: string; dados: AgingResultado }) {
  const faixas = dados.vencido.filter((f) => f.total > 0);
  const maior = Math.max(...faixas.map((f) => f.total), 1);

  return (
    <div className="rounded-2xl bg-card shadow-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold text-foreground">{titulo}</h2>
        <span className="text-sm font-bold tabular-nums text-destructive">{formatarMoeda(dados.totalVencido)}</span>
      </div>

      {faixas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada vencido, tudo em dia.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {faixas.map((faixa, i) => (
            <div key={faixa.rotulo} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-muted-foreground">{faixa.rotulo}</span>
              <TrilhoBarra
                valorPercentual={faixa.total / maior}
                cor={CORES_SEVERIDADE[i % CORES_SEVERIDADE.length]}
                valorFormatado={formatarMoeda(faixa.total)}
              />
              <span className="min-w-20 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                {formatarNumeroCompacto(faixa.total)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
