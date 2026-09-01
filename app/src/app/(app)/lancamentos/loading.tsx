import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeleton-table";

export default function CarregandoLancamentos() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-40" />
      <SkeletonTable colunas={6} linhas={10} />
    </div>
  );
}
