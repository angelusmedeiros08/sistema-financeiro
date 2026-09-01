import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeleton-table";

export default function CarregandoFluxoCaixa() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-44" />
      <SkeletonTable colunas={6} linhas={10} />
    </div>
  );
}
