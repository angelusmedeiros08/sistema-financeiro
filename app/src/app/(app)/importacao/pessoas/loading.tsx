import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonForm } from "@/components/ui/skeleton-form";

export default function CarregandoImportarPessoas() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-7 w-72" />
      <SkeletonForm />
    </div>
  );
}
