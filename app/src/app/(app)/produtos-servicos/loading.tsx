import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonForm } from "@/components/ui/skeleton-form";
import { SkeletonTable } from "@/components/ui/skeleton-table";

export default function CarregandoProdutosServicos() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-52" />
      <SkeletonForm campos={4} />
      <SkeletonTable colunas={4} linhas={8} />
    </div>
  );
}
