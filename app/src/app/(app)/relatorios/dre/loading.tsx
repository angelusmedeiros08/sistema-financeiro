import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { CabecalhoRelatoriosCarregando } from "../cabecalho-carregando";

// Aba padrão (Matriz mensal) usa tabela — as outras 2 abas (Cascata,
// Indicadores) não têm skeleton próprio: o loading só acontece na
// primeira carga da rota, antes do usuário poder ter trocado de aba.
export default function CarregandoDre() {
  return (
    <div className="flex w-full flex-col gap-6">
      <CabecalhoRelatoriosCarregando />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-56 rounded-control" />
        <Skeleton className="h-9 w-48 rounded-full" />
      </div>
      <SkeletonTable colunas={8} linhas={10} />
    </div>
  );
}
