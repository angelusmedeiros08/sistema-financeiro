import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { CabecalhoRelatoriosCarregando } from "../cabecalho-carregando";

export default function CarregandoCentroCusto() {
  return (
    <div className="flex w-full flex-col gap-6">
      <CabecalhoRelatoriosCarregando />
      <Skeleton className="h-9 w-72 rounded-control" />
      <SkeletonTable colunas={5} linhas={6} />
    </div>
  );
}
