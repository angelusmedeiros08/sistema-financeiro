// Recorte estilizado do Painel — não é um screenshot real (dado de tenant
// real não vai numa página pública), mas usa a mesma gramática visual do
// app de verdade (tokens de cor, tabular-nums, badges +/-), não um mockup
// genérico de "app fictício" com ícones soltos.
const LANCAMENTOS_EXEMPLO = [
  { descricao: "Recebimento de Cliente Vertex", valor: 12400, tipo: "RECEITA" as const },
  { descricao: "Pagamento a Gráfica União", valor: -1890, tipo: "DESPESA" as const },
  { descricao: "Folha de pagamento", valor: -18230, tipo: "DESPESA" as const },
];

function formatarExemplo(valor: number): string {
  const abs = Math.abs(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${valor < 0 ? "-" : "+"} R$ ${abs}`;
}

export function PainelPreview() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-[0_24px_60px_-24px_rgba(26,29,31,0.25)]">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Saldo em caixa</p>
          <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-foreground">R$ 84.210,55</p>
        </div>
        <span className="rounded-full bg-positivo/12 px-2.5 py-1 text-[11px] font-semibold text-positivo-foreground">+6,2% no mês</span>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {LANCAMENTOS_EXEMPLO.map((item) => (
          <div key={item.descricao} className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
            <span className="truncate text-sm text-foreground/80">{item.descricao}</span>
            <span
              className={`shrink-0 text-sm font-semibold tabular-nums ${item.tipo === "RECEITA" ? "text-positivo-foreground" : "text-muted-foreground"}`}
            >
              {formatarExemplo(item.valor)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-end gap-1.5 border-t border-border pt-4">
        {[38, 52, 44, 61, 58, 70, 65, 78].map((altura, i) => (
          <div key={i} className="flex-1 rounded-t bg-primary/70" style={{ height: `${altura}px` }} />
        ))}
      </div>
    </div>
  );
}
