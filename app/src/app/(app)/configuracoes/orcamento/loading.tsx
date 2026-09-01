import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeleton-table";

export default function CarregandoConfiguracaoOrcamento() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-full max-w-2xl rounded-2xl" />
      <SkeletonTable colunas={3} linhas={6} />
    </div>
  );
}
