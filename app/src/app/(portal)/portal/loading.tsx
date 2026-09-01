import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonKpiCard } from "@/components/ui/skeleton-kpi-card";
import { SkeletonChart } from "@/components/ui/skeleton-chart";
import { SkeletonTransactionList } from "@/components/ui/skeleton-transaction-list";

export default function CarregandoPortal() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonKpiCard />
        <SkeletonKpiCard />
        <SkeletonKpiCard />
        <SkeletonKpiCard />
        <SkeletonKpiCard />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <SkeletonChart aspectRatio={16 / 9} variante="linha" />
        <SkeletonTransactionList itens={5} />
      </div>
    </div>
  );
}
