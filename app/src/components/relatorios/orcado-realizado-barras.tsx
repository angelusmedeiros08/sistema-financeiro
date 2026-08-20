import type { LinhaOrcadoRealizado } from "@/lib/orcamento/orcamento";
import { formatarNumeroCompacto, formatarPercentual } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

// Previsto (cinza) e realizado (colorido) lado a lado por categoria, mesma
// escala — desvio positivo é ruim pra despesa (gastou mais que o
// planejado) e bom pra receita (recebeu mais), a cor do badge inverte
// conforme o tipo.
export function OrcadoRealizadoBarras({ linhas }: { linhas: LinhaOrcadoRealizado[] }) {
  if (linhas.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma categoria com orçamento ou movimento no ano selecionado.</p>;
  }

  const maior = Math.max(...linhas.map((l) => Math.max(l.totalPrevisto, l.totalRealizado)), 1);

  return (
    <div className="flex flex-col gap-4">
      {linhas.map((linha) => {
        const estourou = linha.tipo === "DESPESA" ? linha.desvioPercentual > 0 : linha.desvioPercentual < 0;
        const corDesvio = linha.desvioPercentual === 0 ? "text-muted-foreground" : estourou ? "text-[#B23A2E]" : "text-[#0FA37E]";

        return (
          <div key={linha.categoriaId}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">{linha.categoriaNome}</span>
              <span className={cn("text-xs font-bold tabular-nums", corDesvio)}>
                {linha.desvioPercentual > 0 ? "+" : ""}
                {formatarPercentual(linha.desvioPercentual)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[10px] text-muted-foreground">Previsto</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[#E3A62F]/50 transition-[width] duration-500 ease-out"
                    style={{ width: `${(linha.totalPrevisto / maior) * 100}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{formatarNumeroCompacto(linha.totalPrevisto)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[10px] text-muted-foreground">Realizado</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${(linha.totalRealizado / maior) * 100}%`, background: linha.tipo === "RECEITA" ? "#0FA37E" : "#4C7DF0" }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-[10px] font-semibold tabular-nums text-foreground">
                  {formatarNumeroCompacto(linha.totalRealizado)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
