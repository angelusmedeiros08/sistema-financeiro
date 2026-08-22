import { Badge } from "@/components/ui/badge";
import { formatarMoeda } from "@/lib/formatacao";

// Mesma paridade visual do nível "ALTO" de BadgeRiscoConcentracao — ruptura
// de caixa é sempre severidade alta, não tem gradação de nível como risco
// de concentração.
export function BadgeRupturaSaldo({ saldoD7 }: { saldoD7: number }) {
  return (
    <Badge className="border-none font-semibold bg-destructive/12 text-destructive-foreground">Caixa negativo em 7 dias · {formatarMoeda(saldoD7)}</Badge>
  );
}
