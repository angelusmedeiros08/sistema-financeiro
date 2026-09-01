import { Skeleton } from "@/components/ui/skeleton";

// Par label+input empilhado, repetido por campo — espelha o padrão de
// formulário do sistema (space-y-1.5 entre label e input em quase todo
// formulário financeiro). Só pra telas que buscam um registro existente
// antes de popular os campos; formulário de criação em branco não precisa
// disso (não há fetch antes de renderizar).
export function SkeletonForm({ campos = 4 }: { campos?: number }) {
  const linhas = Array.from({ length: campos });

  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <div className="grid gap-4 sm:grid-cols-2">
        {linhas.map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-full rounded-control" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-5 h-8 w-32 rounded-control" />
    </div>
  );
}
