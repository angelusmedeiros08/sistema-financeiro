import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeleton-table";

export default function CarregandoClientes() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-32" />
      <SkeletonTable colunas={4} linhas={8} />
    </div>
  );
}
