"use client";

import { Question } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger, PopoverHeader, PopoverTitle, PopoverDescription } from "@/components/ui/popover";

// Irmão do TermoComDica (mesmo Popover/ícone, mesmo motivo de ser Popover e
// não hover — mobile-first) só que pra uma explicação dinâmica por
// situação (ex.: "por que aparece um travessão aqui") em vez de um termo
// fixo de glossário financeiro — não generalizar os dois num componente só,
// são conceitualmente diferentes.
export function DicaContextual({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <Question size={14} weight="bold" />
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <PopoverHeader>
          <PopoverTitle>{titulo}</PopoverTitle>
        </PopoverHeader>
        <PopoverDescription>{texto}</PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
