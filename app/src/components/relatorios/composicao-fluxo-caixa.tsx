import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { CategoriaFluxo, ComposicaoFluxoCaixa as ComposicaoFluxoCaixaDados } from "@/lib/relatorios/dfc";
import { formatarNumeroAbreviado } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

// De onde a receita veio × pra onde ela foi, por categoria — era um
// diagrama de Sankey, trocado por duas colunas de barra horizontal (ver
// motivo completo em lib/relatorios/dfc.ts, buscarComposicaoFluxoCaixa).
// Server component puro: sem hover/estado, então não precisa de "use
// client" como o Sankey antigo (ECharts) precisava. "Outras receitas/
// despesas" (resto agregado) fica sem link — agruparTopN não carrega uma
// lista de ids até esse ponto, só a soma (mesmo motivo de qualquer bucket
// "Outras" sem lista de ids sobrevivente).
function Coluna({ titulo, categorias, tom }: { titulo: string; categorias: CategoriaFluxo[]; tom: "receita" | "despesa" }) {
  const maior = Math.max(...categorias.map((c) => c.valor), 1);
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-muted-foreground uppercase">
        <span className={cn("size-1.5 rounded-full", tom === "receita" ? "bg-positivo" : "bg-destructive")} />
        {titulo}
      </h3>
      <div className="flex flex-col gap-2.5">
        {categorias.map((c) => {
          const linha = (
            <div>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className={cn("truncate text-xs font-semibold", c.outros ? "font-medium text-muted-foreground" : "text-foreground")} title={c.nome}>
                  {c.nome}
                </span>
                <span className={cn("shrink-0 text-xs font-bold tabular-nums", c.outros ? "font-medium text-muted-foreground" : "text-muted-foreground")}>
                  {formatarNumeroAbreviado(c.valor)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", c.outros && "opacity-50")}
                  style={{
                    width: `${Math.max((c.valor / maior) * 100, 2)}%`,
                    background:
                      tom === "receita"
                        ? "linear-gradient(90deg, var(--chart-1), var(--positivo))"
                        : "linear-gradient(90deg, var(--primary), var(--destructive))",
                  }}
                />
              </div>
            </div>
          );
          return c.href ? (
            <Link key={c.nome} href={c.href} className="rounded-lg hover:bg-muted">
              {linha}
            </Link>
          ) : (
            <div key={c.nome}>{linha}</div>
          );
        })}
      </div>
    </div>
  );
}

export function ComposicaoFluxoCaixa({ dados }: { dados: ComposicaoFluxoCaixaDados }) {
  if (dados.receitas.length === 0 && dados.despesas.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem movimentação suficiente no período selecionado.</p>;
  }

  const saldo = dados.totalReceitas - dados.totalDespesas;

  return (
    <div>
      <div className="mb-7 flex items-center justify-center gap-3 sm:gap-6">
        <div className="text-center">
          <div className="mb-1 text-[10.5px] font-bold tracking-wide text-muted-foreground uppercase">Receita total</div>
          <div className="text-lg font-extrabold tabular-nums text-positivo">{formatarNumeroAbreviado(dados.totalReceitas)}</div>
        </div>
        <ArrowRight size={18} className="shrink-0 text-muted-foreground" />
        <div className="text-center">
          <div className="mb-1 text-[10.5px] font-bold tracking-wide text-muted-foreground uppercase">
            {saldo >= 0 ? "Saldo do período" : "Déficit do período"}
          </div>
          <div className="text-lg font-extrabold tabular-nums text-primary">{formatarNumeroAbreviado(Math.abs(saldo))}</div>
        </div>
        <ArrowRight size={18} className="shrink-0 text-muted-foreground" />
        <div className="text-center">
          <div className="mb-1 text-[10.5px] font-bold tracking-wide text-muted-foreground uppercase">Despesa total</div>
          <div className="text-lg font-extrabold tabular-nums text-destructive">{formatarNumeroAbreviado(dados.totalDespesas)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-9">
        <Coluna titulo="De onde veio" categorias={dados.receitas} tom="receita" />
        <Coluna titulo="Pra onde foi" categorias={dados.despesas} tom="despesa" />
      </div>
    </div>
  );
}
