import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonChart } from "@/components/ui/skeleton-chart";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { CabecalhoRelatoriosCarregando } from "../cabecalho-carregando";

export default function CarregandoAging() {
  return (
    <div className="flex w-full flex-col gap-6">
      <CabecalhoRelatoriosCarregando />
      <Skeleton className="h-9 w-72 rounded-control" />
      <SkeletonChart aspectRatio={21 / 9} />
      <SkeletonTable colunas={5} linhas={6} />
    </div>
  );
}
