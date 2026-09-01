import { Skeleton } from "@/components/ui/skeleton";

// Cabeçalho (título + badge de status) seguido de blocos de seção — regra
// da Polaris aplicada aqui: rótulo/título da seção seria texto estático em
// muitas páginas de detalhe reais, só o valor variável precisaria de
// skeleton; como o título real muda por página (nome do cliente, número
// da venda...), tratamos o bloco inteiro como skeleton por simplicidade.
export function SkeletonDetailPage({ secoes = 2 }: { secoes?: number }) {
  const blocos = Array.from({ length: secoes });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      {blocos.map((_, i) => (
        <div key={i} className="rounded-2xl bg-card p-5 shadow-card">
          <Skeleton className="mb-4 h-3.5 w-32" />
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-3.5 w-full max-w-md" />
            <Skeleton className="h-3.5 w-full max-w-sm" />
            <Skeleton className="h-3.5 w-2/3 max-w-xs" />
          </div>
        </div>
      ))}
    </div>
  );
}
