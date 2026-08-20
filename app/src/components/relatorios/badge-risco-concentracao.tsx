import { Badge } from "@/components/ui/badge";
import { formatarPercentual } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import type { NivelRiscoConcentracao } from "@/lib/relatorios/concentracao-receita";

const ROTULO: Record<NivelRiscoConcentracao, string> = {
  ALTO: "Risco alto",
  MEDIO: "Risco médio",
  BAIXO: "Risco baixo",
};

const COR: Record<NivelRiscoConcentracao, string> = {
  ALTO: "bg-[#B23A2E]/12 text-[#8A2E24]",
  MEDIO: "bg-[#C98A1F]/12 text-[#96690F]",
  BAIXO: "bg-[#157F6B]/12 text-[#0F5F50]",
};

export function BadgeRiscoConcentracao({ nivelRisco, percentualTop3 }: { nivelRisco: NivelRiscoConcentracao; percentualTop3: number }) {
  return (
    <Badge className={cn("border-none font-semibold", COR[nivelRisco])}>
      {ROTULO[nivelRisco]} · Top 3 clientes = {formatarPercentual(percentualTop3)} da receita
    </Badge>
  );
}
