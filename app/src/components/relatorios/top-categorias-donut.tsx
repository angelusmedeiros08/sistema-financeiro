import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { formatarMoeda, formatarNumeroCompacto, formatarPercentual } from "@/lib/formatacao";
import type { LinhaAnaliseCategoria } from "@/lib/relatorios/analise-despesas";

// Rosca com até 5 fatias + "Outras" agregando o resto — estilo validado no
// companion de brainstorming (preferido a ranking em barra e a treemap).
// Motor de desenho é @visx/shape (Pie) em vez de strokeDasharray calculado
// à mão — mesmo resultado visual, mas sem a trigonometria manual, e abre
// caminho pra tooltip por fatia no futuro sem reescrever o componente.
const PALETA = ["#7A8B5C", "#157F6B", "#C98A1F", "#D8583A", "#4F5C3A", "#8A94A6"];
const RAIO = 70;
const ESPESSURA = 28;
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
            <Group top={100} left={100}>
              <Pie data={fatias} pieValue={(f) => f.total} outerRadius={RAIO} innerRadius={RAIO - ESPESSURA} padAngle={0.012}>
                {(pie) => pie.arcs.map((arc) => <path key={arc.data.rotulo} d={pie.path(arc) ?? undefined} fill={arc.data.cor} />)}
              </Pie>
            </Group>
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
