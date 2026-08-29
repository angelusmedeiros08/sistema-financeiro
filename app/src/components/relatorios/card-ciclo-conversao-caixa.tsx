import { cn } from "@/lib/utils";
import { TermoComDica } from "@/components/formularios/termo-com-dica";

// Mesma tipografia/cor de CardPrazoMedio (indicadores/page.tsx): positivo
// (cliente atrasa mais que você atrasa fornecedor) é ruim, negativo é bom.
// "Aproximado" no rótulo porque PMR/PMP aqui medem atraso vs. vencimento,
// não o DSO/DPO contábil clássico (ver spec, Seção 5) — reaproveitados como
// estão, sem recalcular.
export function CardCicloConversaoCaixa({ dias, pmrDias, pmpDias }: { dias: number; pmrDias: number; pmpDias: number }) {
  return (
    <div className="rounded-2xl bg-card shadow-card p-5">
      <p className="mb-1 text-xs font-semibold text-muted-foreground">
        <TermoComDica termo="ciclo_conversao_caixa">Ciclo de conversão de caixa</TermoComDica> (aproximado)
      </p>
      <p className={cn("text-2xl font-bold tabular-nums", dias > 0 ? "text-destructive" : "text-positivo")}>
        {dias >= 0 ? "+" : ""}
        {dias.toFixed(1)} dias
      </p>
      <p className="text-xs text-muted-foreground">
        PMR {pmrDias >= 0 ? "+" : ""}
        {pmrDias.toFixed(1)}d − PMP {pmpDias >= 0 ? "+" : ""}
        {pmpDias.toFixed(1)}d
      </p>
    </div>
  );
}
