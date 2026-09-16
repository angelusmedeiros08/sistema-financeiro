import { CheckCircle, FileText } from "@phosphor-icons/react/dist/ssr";

// Três telas estilizadas, uma por funcionalidade em destaque. Mesma
// gramática visual do PainelPreview (tokens reais, não mockup genérico),
// carregam a prova de produto em vez de um grid de ícone repetido.

export function VisualImportacaoIA() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-[0_24px_60px_-24px_rgba(26,29,31,0.25)]">
      <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-border bg-muted/50 px-3 py-2.5">
        <FileText className="size-5 shrink-0 text-muted-foreground" weight="bold" />
        <span className="text-sm text-muted-foreground">recibo-fornecedor.pdf</span>
      </div>
      <div className="my-3 flex justify-center text-muted-foreground/50">
        <svg width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden>
          <path d="M8 0V17M8 17L2 11M8 17L14 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-positivo/10 px-3 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Compra de material</p>
          <p className="text-xs text-muted-foreground">Despesa · Fornecedores</p>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-positivo-foreground">
          <CheckCircle className="size-4" weight="fill" />
          Confirmado
        </span>
      </div>
    </div>
  );
}

export function VisualRelatorios() {
  const pontos = [24, 30, 22, 38, 34, 46, 40, 52, 48, 60];
  const largura = 280;
  const altura = 90;
  const passo = largura / (pontos.length - 1);
  const max = Math.max(...pontos);
  const linha = pontos.map((v, i) => `${i * passo},${altura - (v / max) * altura}`).join(" ");

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-[0_24px_60px_-24px_rgba(26,29,31,0.25)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">DRE, últimos 6 meses</p>
      </div>
      <svg viewBox={`0 0 ${largura} ${altura}`} className="mt-3 w-full" preserveAspectRatio="none" aria-hidden>
        <polyline points={linha} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Receita</p>
          <p className="font-heading text-sm font-bold tabular-nums text-foreground">R$ 68,2k</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Despesa</p>
          <p className="font-heading text-sm font-bold tabular-nums text-foreground">R$ 41,7k</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Resultado</p>
          <p className="font-heading text-sm font-bold tabular-nums text-positivo-foreground">R$ 26,5k</p>
        </div>
      </div>
    </div>
  );
}

export function VisualChatIA() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-[0_24px_60px_-24px_rgba(26,29,31,0.25)]">
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-muted px-3.5 py-2 text-sm text-foreground">Quanto entrou em março?</p>
      </div>
      <div className="mt-3 flex justify-start">
        <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-primary/10 px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
          Março fechou com <span className="font-semibold text-primary">R$ 42.300,00</span> em receitas, 12% a mais que fevereiro.
        </p>
      </div>
    </div>
  );
}
