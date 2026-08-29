"use client";

import { Question } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger, PopoverHeader, PopoverTitle, PopoverDescription } from "@/components/ui/popover";
import { GLOSSARIO_FINANCEIRO } from "@/lib/glossario-financeiro";

// Ícone (?) ao lado de um rótulo — clique/toque abre a explicação do termo.
// Só o ícone é o trigger, nunca o texto do rótulo em si (clicar no rótulo
// não deveria abrir nada). Popover em vez de tooltip por hover: a maior
// parte do uso é mobile-first, e hover não existe em touch.
export function TermoComDica({ termo, children }: { termo: keyof typeof GLOSSARIO_FINANCEIRO; children: React.ReactNode }) {
  const info = GLOSSARIO_FINANCEIRO[termo];

  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <Popover>
        <PopoverTrigger
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
          aria-label={`O que é ${info.titulo}?`}
          // Vários lugares usam TermoComDica dentro do rótulo de um StatCard
          // com `href` (o card inteiro é um <Link>) — sem isso, tocar no
          // ícone navegava pro card em vez de abrir o popover.
          onClick={(e) => e.stopPropagation()}
        >
          <Question size={14} weight="bold" />
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <PopoverHeader>
            <PopoverTitle>{info.titulo}</PopoverTitle>
          </PopoverHeader>
          <PopoverDescription>{info.explicacao}</PopoverDescription>
          {info.formula && <p className="font-mono text-xs text-muted-foreground/80">{info.formula}</p>}
        </PopoverContent>
      </Popover>
    </span>
  );
}
