import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonChart } from "@/components/ui/skeleton-chart";
import { CabecalhoRelatoriosCarregando } from "../cabecalho-carregando";

export default function CarregandoPontoEquilibrio() {
  return (
    <div className="flex w-full flex-col gap-6">
      <CabecalhoRelatoriosCarregando />
      <Skeleton className="h-9 w-32 rounded-control" />
      <SkeletonChart aspectRatio={21 / 9} variante="linha" />
    </div>
  );
}
