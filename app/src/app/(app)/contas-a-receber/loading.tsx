import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeleton-table";

export default function CarregandoContasAReceber() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-9 w-96 rounded-full" />
      <SkeletonTable colunas={5} linhas={10} />
    </div>
  );
}
