import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonForm } from "@/components/ui/skeleton-form";
import { SkeletonTable } from "@/components/ui/skeleton-table";

export default function CarregandoCentrosCusto() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-full max-w-2xl rounded-2xl" />
      <SkeletonForm campos={2} />
      <SkeletonTable colunas={3} linhas={4} />
    </div>
  );
}
