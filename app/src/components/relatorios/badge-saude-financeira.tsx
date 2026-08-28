import { Badge } from "@/components/ui/badge";
import { formatarIndice } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import type { NivelLiquidez } from "@/lib/relatorios/liquidez-aproximada";

const ROTULO: Record<NivelLiquidez, string> = {
  RISCO: "Liquidez em risco",
  ATENCAO: "Liquidez em atenção",
  SAUDAVEL: "Liquidez confortável",
};

const COR: Record<NivelLiquidez, string> = {
  RISCO: "bg-destructive/12 text-destructive-foreground",
  ATENCAO: "bg-[#C98A1F]/12 text-[#96690F]",
  SAUDAVEL: "bg-positivo/12 text-positivo-foreground",
};

export function BadgeSaudeFinanceira({ nivel, indice }: { nivel: NivelLiquidez; indice: number | null }) {
  return (
    <Badge className={cn("border-none font-semibold", COR[nivel])}>
      {ROTULO[nivel]}
      {indice !== null && ` · ${formatarIndice(indice)}`}
    </Badge>
  );
}
