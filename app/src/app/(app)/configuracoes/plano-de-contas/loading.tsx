import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonForm } from "@/components/ui/skeleton-form";
import { SkeletonTable } from "@/components/ui/skeleton-table";

export default function CarregandoPlanoDeContas() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-full max-w-2xl rounded-2xl" />
      <SkeletonForm campos={5} />
      <SkeletonTable colunas={5} linhas={5} />
    </div>
  );
}
