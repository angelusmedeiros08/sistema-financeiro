import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeleton-table";

// Grade de previsionamento é uma planilha de 12 meses por categoria —
// mais colunas que uma listagem comum, sem template próprio no catálogo.
export default function CarregandoPrevisionamento() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-48" />
      <SkeletonTable colunas={8} linhas={10} />
    </div>
  );
}
