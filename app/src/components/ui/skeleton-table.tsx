import { Skeleton } from "@/components/ui/skeleton";

// Espelha a moldura real de TabelaLista (tabela/tabela-lista.tsx): título +
// contagem no topo (px-4.5 py-3.5), linha de cabeçalho, N linhas de corpo
// (px-4.5 py-3.5), rodapé de paginação — mesmo ritmo de padding pra não
// pular quando o conteúdo real chegar. Larguras de coluna variam num
// padrão fixo (não uniforme) pra não parecer grade repetida.
const LARGURAS = ["w-8/12", "w-6/12", "w-4/12", "w-5/12", "w-3/12", "w-4/12"];

export function SkeletonTable({ colunas = 5, linhas = 6 }: { colunas?: number; linhas?: number }) {
  const cols = Array.from({ length: colunas });
  const rows = Array.from({ length: linhas });

  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-4.5 py-3.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>

      <div className="flex gap-4 border-b border-border px-4.5 py-3">
        {cols.map((_, i) => (
          <Skeleton key={i} className="h-2.5 w-16" />
        ))}
      </div>

      {rows.map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-border px-4.5 py-3.5 last:border-none">
          {cols.map((_, c) => (
            <Skeleton key={c} className={`h-3.5 flex-1 ${LARGURAS[(r + c) % LARGURAS.length]}`} />
          ))}
        </div>
      ))}

      <div className="flex items-center justify-between px-4.5 py-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-20 rounded-md" />
      </div>
    </div>
  );
}
