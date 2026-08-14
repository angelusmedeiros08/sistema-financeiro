import { formatarMoeda, formatarNumeroCompacto, formatarPercentual } from "@/lib/formatacao";
import type { LinhaAnaliseCategoria } from "@/lib/relatorios/analise-despesas";

// Rosca com até 5 fatias + "Outras" agregando o resto — estilo validado no
// companion de brainstorming (preferido a ranking em barra e a treemap).
const PALETA = ["#6A56D8", "#157F6B", "#C98A1F", "#D8583A", "#4E3EAD", "#8A94A6"];
const RAIO = 70;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
const MAX_FATIAS_NOMEADAS = 5;

type Fatia = { rotulo: string; total: number; cor: string };

function agregarFatias(linhas: LinhaAnaliseCategoria[]): Fatia[] {
  const ordenadas = [...linhas].sort((a, b) => b.total - a.total);
  const principais = ordenadas.slice(0, MAX_FATIAS_NOMEADAS);
  const resto = ordenadas.slice(MAX_FATIAS_NOMEADAS);
  const totalResto = resto.reduce((soma, l) => soma + l.total, 0);

  const fatias: Fatia[] = principais.map((linha, i) => ({ rotulo: linha.categoriaNome, total: linha.total, cor: PALETA[i] }));
  if (totalResto > 0) fatias.push({ rotulo: "Outras", total: totalResto, cor: PALETA[PALETA.length - 1] });
  return fatias;
}

export function TopCategoriasDonut({ titulo, linhas }: { titulo: string; linhas: LinhaAnaliseCategoria[] }) {
  const fatias = agregarFatias(linhas);
  const total = fatias.reduce((soma, f) => soma + f.total, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 font-heading text-sm font-bold text-foreground">{titulo}</h2>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma movimentação no período selecionado.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-6">
          <svg viewBox="0 0 200 200" width="170" height="170" className="shrink-0">
            {(() => {
              let acumulado = 0;
              return fatias.map((fatia) => {
                const fracao = fatia.total / total;
                const dasharray = `${fracao * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`;
                const dashoffset = -acumulado * CIRCUNFERENCIA;
                acumulado += fracao;
                return (
                  <circle
                    key={fatia.rotulo}
                    cx="100"
                    cy="100"
                    r={RAIO}
                    fill="none"
                    stroke={fatia.cor}
                    strokeWidth="28"
                    strokeDasharray={dasharray}
                    strokeDashoffset={dashoffset}
                    transform="rotate(-90 100 100)"
                  />
                );
              });
            })()}
            <text x="100" y="96" textAnchor="middle" className="fill-foreground" fontSize="19" fontWeight="700">
              {formatarNumeroCompacto(total)}
            </text>
            <text x="100" y="116" textAnchor="middle" className="fill-muted-foreground" fontSize="11">
              total
            </text>
          </svg>

          <ul className="flex min-w-40 flex-1 flex-col gap-2">
            {fatias.map((fatia) => (
              <li key={fatia.rotulo} className="flex items-center gap-2 text-xs">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: fatia.cor }} />
                <span className="flex-1 truncate text-muted-foreground">{fatia.rotulo}</span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">{formatarMoeda(fatia.total)}</span>
                <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">{formatarPercentual(fatia.total / total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
