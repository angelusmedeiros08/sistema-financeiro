import { TrilhoBarra } from "./trilho-barra";
import { formatarMoeda, formatarIndice } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { TermoComDica } from "@/components/formularios/termo-com-dica";
import type { LiquidezAproximada } from "@/lib/relatorios/liquidez-aproximada";

const COR_BARRA: Record<LiquidezAproximada["nivel"], string> = {
  RISCO: "var(--destructive)",
  ATENCAO: "#C98A1F",
  SAUDAVEL: "var(--positivo)",
};

const COR_TEXTO: Record<LiquidezAproximada["nivel"], string> = {
  RISCO: "text-destructive",
  ATENCAO: "text-[#96690F]",
  SAUDAVEL: "text-positivo",
};

// Teto visual da barra — sem isso, um índice de 4,0 (tenant sem quase nada a
// pagar em 30 dias) deixaria a diferença entre "1,6" e "4,0" achatada no
// mesmo tico da régua (os dois já são "saudável" pela mesma razão). 2,0 dá
// folga acima do limiar de 1,5 sem esconder que valores bem altos existem —
// a barra fica cheia, não estoura pra fora do trilho.
const TETO_BARRA = 2.0;

export function CardLiquidez({ indice, nivel, caixaAtual, aReceber30d, aPagar30d }: LiquidezAproximada) {
  const percentualBarra = indice === null ? 1 : Math.min(indice, TETO_BARRA) / TETO_BARRA;

  return (
    <div className="rounded-2xl bg-card shadow-card p-5">
      <p className="mb-1 text-xs font-semibold text-muted-foreground">
        <TermoComDica termo="liquidez_aproximada">Liquidez aproximada</TermoComDica>
      </p>
      <p className={cn("text-2xl font-bold tabular-nums", COR_TEXTO[nivel])}>{indice === null ? "—" : formatarIndice(indice)}</p>
      <div className="my-3">
        <TrilhoBarra
          valorPercentual={percentualBarra}
          cor={COR_BARRA[nivel]}
          valorFormatado={indice === null ? "Sem contas a pagar em 30 dias" : formatarIndice(indice)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatarMoeda(caixaAtual)} em caixa + {formatarMoeda(aReceber30d)} a receber (30d) ÷ {formatarMoeda(aPagar30d)} a pagar (30d)
      </p>
    </div>
  );
}
