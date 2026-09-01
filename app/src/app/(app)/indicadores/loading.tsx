import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonChart } from "@/components/ui/skeleton-chart";

// Central de Indicadores tem 6 seções (Saldo projetado, Concentração,
// Variação de categorias, Prazos médios/Aging, Distribuição por forma de
// pagamento, Liquidez/ciclo de caixa) — cada uma um card "rounded-2xl p-6"
// com título + gráfico ou par de donuts. Sem tentar espelhar cada
// subcomponente exato (badges, listas de risco): a estrutura de card +
// título + área de gráfico já é o que evita o salto de layout maior.
function SecaoUmGrafico() {
  return (
    <section className="rounded-2xl bg-card p-6 shadow-card">
      <Skeleton className="mb-4 h-4 w-52" />
      <SkeletonChart aspectRatio={16 / 6} />
    </section>
  );
}

function SecaoDoisGraficos() {
  return (
    <section className="rounded-2xl bg-card p-6 shadow-card">
      <Skeleton className="mb-4 h-4 w-64" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonChart aspectRatio={1} />
        <SkeletonChart aspectRatio={1} />
      </div>
    </section>
  );
}

export default function CarregandoIndicadores() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-32" />
      </div>

      <SecaoUmGrafico />
      <SecaoDoisGraficos />
      <SecaoDoisGraficos />
      <SecaoUmGrafico />
      <SecaoDoisGraficos />
      <SecaoUmGrafico />
    </div>
  );
}
