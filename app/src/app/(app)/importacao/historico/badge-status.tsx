import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROTULO_STATUS: Record<string, string> = {
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export function BadgeStatusImportacao({ status }: { status: string }) {
  return (
    <Badge
      className={cn(
        "border-none font-semibold",
        status === "em_andamento"
          ? "bg-amber-500/12 text-amber-700"
          : status === "concluida"
            ? "bg-positivo/12 text-positivo-foreground"
            : "bg-muted text-muted-foreground",
      )}
    >
      {ROTULO_STATUS[status] ?? status}
    </Badge>
  );
}
