import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ALTURAS_BARRAS = ["h-[35%]", "h-[62%]", "h-[48%]", "h-[80%]", "h-[55%]", "h-[70%]", "h-[40%]"];

// `aspectRatio` reserva o mesmo espaço do gráfico real (@visx + ParentSize)
// antes dele montar — é o que evita o salto de layout, não a silhueta em
// si. A silhueta (barras de altura variável ou linha ondulada) só comunica
// "isto vai virar um gráfico", não precisa ser fiel ao dado.
export function SkeletonChart({
  aspectRatio = 16 / 9,
  variante = "barras",
}: {
  aspectRatio?: number;
  variante?: "barras" | "linha";
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <Skeleton className="mb-4 h-4 w-40" />
      <div className="flex items-end gap-2 rounded-lg bg-muted/40 p-4" style={{ aspectRatio }}>
        {variante === "barras" ? (
          ALTURAS_BARRAS.map((altura, i) => <Skeleton key={i} className={cn("flex-1 rounded-t-sm", altura)} />)
        ) : (
          <svg viewBox="0 0 280 100" preserveAspectRatio="none" className="h-full w-full animate-pulse text-muted-foreground/25">
            <path d="M0 70 Q 35 20, 70 55 T 140 40 T 210 60 T 280 25" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
        )}
      </div>
    </div>
  );
}
