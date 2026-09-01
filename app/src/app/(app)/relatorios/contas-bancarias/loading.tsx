import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonKpiCard } from "@/components/ui/skeleton-kpi-card";
import { CabecalhoRelatoriosCarregando } from "../cabecalho-carregando";

export default function CarregandoContasBancarias() {
  return (
    <div className="flex w-full flex-col gap-6">
      <CabecalhoRelatoriosCarregando />
      <Skeleton className="h-9 w-72 rounded-control" />
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkeletonKpiCard />
        <SkeletonKpiCard />
      </div>
    </div>
  );
}
