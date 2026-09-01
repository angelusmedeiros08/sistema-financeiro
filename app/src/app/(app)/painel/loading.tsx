import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonKpiCard } from "@/components/ui/skeleton-kpi-card";
import { SkeletonChart } from "@/components/ui/skeleton-chart";
import { SkeletonTransactionList } from "@/components/ui/skeleton-transaction-list";

export default function CarregandoPainel() {
  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>

        {/* Saldo em caixa + Resultado do mês: cartões maiores, formato
            próprio (gradiente/destaque) — não é o mesmo formato de
            SkeletonKpiCard, mantido como bloco cru igual ao original. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Skeleton className="h-40 rounded-2xl lg:col-span-5" />
          <Skeleton className="h-40 rounded-2xl lg:col-span-7" />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SkeletonKpiCard />
          <SkeletonKpiCard />
          <SkeletonKpiCard />
          <SkeletonKpiCard />
        </div>

        {/* Gauges de % Realizado: menores que um KpiCard, sem template
            próprio no catálogo — bloco cru na mesma altura de sempre. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>

        <SkeletonChart aspectRatio={16 / 5} variante="linha" />
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <Skeleton className="h-40 rounded-2xl" />
        <SkeletonTransactionList itens={5} />
      </div>
    </div>
  );
}
