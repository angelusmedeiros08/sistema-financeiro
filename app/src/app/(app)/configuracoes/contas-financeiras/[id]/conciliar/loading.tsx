import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeleton-table";

export default function CarregandoConciliacao() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-24 rounded-2xl" />
      <SkeletonTable colunas={5} linhas={8} />
    </div>
  );
}
