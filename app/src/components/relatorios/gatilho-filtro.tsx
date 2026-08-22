"use client";

// Gatilho compacto reusado por todo controle de filtro em cartão-pill da
// seção de Relatórios (Regime/Visão em controles.tsx, Regime na DRE) — só
// mostra o valor escolhido, resto fica no menu que abre. Extraído de
// controles.tsx pra evitar duplicar o mesmo forwardRef em cada página que
// precisar de um dropdown de filtro.
//
// Radix `asChild` (DropdownMenuTrigger/PopoverTrigger) clona o filho direto
// e mescla onClick/aria-expanded/data-state/ref nele via Slot — um
// componente que não repassa `...props` e não encaminha `ref` quebra isso
// em silêncio (renderiza normal, só não abre nada no clique).
import { forwardRef } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export const GatilhoFiltro = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & {
    icone: React.ComponentType<{ size?: number; className?: string }>;
    rotulo?: string;
    valor: string;
  }
>(({ icone: Icone, rotulo, valor, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "group/gatilho flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 py-[7px] text-xs shadow-[0_1px_2px_rgba(26,29,31,0.03)] transition-colors hover:border-primary data-[state=open]:border-primary data-[state=open]:shadow-[0_0_0_3px_rgba(216,88,58,0.12)]",
      className,
    )}
    {...props}
  >
    <Icone size={13} className="shrink-0 text-muted-foreground" />
    {rotulo && <span className="font-semibold text-muted-foreground">{rotulo}</span>}
    <span className="font-bold text-foreground">{valor}</span>
    <CaretDown size={11} className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]/gatilho:rotate-180" />
  </button>
));
GatilhoFiltro.displayName = "GatilhoFiltro";
