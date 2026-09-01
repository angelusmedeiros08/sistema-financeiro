import { Skeleton } from "@/components/ui/skeleton";

// Espelha a geometria do StatCard real (painel/stat-card.tsx): ícone
// circular pequeno, rótulo curto, número grande, variação pequena — nessa
// ordem de cima pra baixo. O número grande é o elemento que mais "salta"
// sem reserva de espaço, por isso ganha a barra mais alta do grupo.
export function SkeletonKpiCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-card">
      <Skeleton className="size-8 rounded-full" />
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}
