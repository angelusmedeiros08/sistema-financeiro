import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonChart } from "@/components/ui/skeleton-chart";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { CabecalhoRelatoriosCarregando } from "../cabecalho-carregando";

export default function CarregandoVisaoGeral() {
  return (
    <div className="flex w-full flex-col gap-6">
      <CabecalhoRelatoriosCarregando />
      <Skeleton className="h-9 w-72 rounded-control" />
      <SkeletonChart aspectRatio={16 / 6} variante="linha" />
      <SkeletonChart aspectRatio={16 / 6} />
      <SkeletonTable colunas={4} linhas={5} />
    </div>
  );
}
