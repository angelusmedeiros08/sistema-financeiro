import { Badge } from "@/components/ui/badge";
import { formatarPercentual } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import type { NivelRiscoConcentracao } from "@/lib/relatorios/concentracao";

const ROTULO: Record<NivelRiscoConcentracao, string> = {
  ALTO: "Risco alto",
  MEDIO: "Risco médio",
  BAIXO: "Risco baixo",
};

const COR: Record<NivelRiscoConcentracao, string> = {
  ALTO: "bg-destructive/12 text-destructive-foreground",
  MEDIO: "bg-[#C98A1F]/12 text-[#96690F]",
  BAIXO: "bg-positivo/12 text-positivo-foreground",
};

export function BadgeRiscoConcentracao({
  nivelRisco,
  percentualTop3,
  entidadeLabel = "clientes",
  totalLabel = "receita",
}: {
  nivelRisco: NivelRiscoConcentracao;
  percentualTop3: number;
  entidadeLabel?: "clientes" | "fornecedores";
  totalLabel?: "receita" | "despesa";
}) {
  return (
    <Badge className={cn("border-none font-semibold", COR[nivelRisco])}>
      {ROTULO[nivelRisco]} · Top 3 {entidadeLabel} = {formatarPercentual(percentualTop3)} da {totalLabel}
    </Badge>
  );
}
