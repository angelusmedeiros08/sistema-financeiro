import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonForm } from "@/components/ui/skeleton-form";

export default function CarregandoDesfazerImportacao() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-7 w-56" />
      <SkeletonForm campos={2} />
    </div>
  );
}
