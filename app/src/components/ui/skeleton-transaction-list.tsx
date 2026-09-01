import { Skeleton } from "@/components/ui/skeleton";

// Espelha a linha real de "Lançamentos recentes" (painel/page.tsx): ícone
// quadrado size-8, duas linhas de texto (descrição + categoria/data), valor
// alinhado à direita. Mais compacto que SkeletonTable — geometria própria
// de extrato, não uma tabela genérica.
export function SkeletonTransactionList({ itens = 5 }: { itens?: number }) {
  const linhas = Array.from({ length: itens });

  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <Skeleton className="mb-4 h-3.5 w-36" />
      <div className="flex flex-col">
        {linhas.map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border py-2.5 last:border-none">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-3.5 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
