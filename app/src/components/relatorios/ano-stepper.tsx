"use client";

// Navegador de ano compacto — mesmo cartão-pill do GatilhoFiltro (borda +
// sombra), usado pelas páginas de relatório anual (DRE, DFC) que não têm
// Granularidade/Período livre (RelatoriosControles), só "o ano inteiro".
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";

export function AnoStepper({ ano, onMudar }: { ano: number; onMudar: (ano: number) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-[10px] border border-border bg-card px-1 py-[3px] shadow-[0_1px_2px_rgba(26,29,31,0.03)]">
      <button
        type="button"
        onClick={() => onMudar(ano - 1)}
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Ano anterior"
      >
        <CaretLeft size={12} weight="bold" />
      </button>
      <span className="min-w-[3.5ch] text-center text-xs font-bold tabular-nums text-foreground">{ano}</span>
      <button
        type="button"
        onClick={() => onMudar(ano + 1)}
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Próximo ano"
      >
        <CaretRight size={12} weight="bold" />
      </button>
    </div>
  );
}
