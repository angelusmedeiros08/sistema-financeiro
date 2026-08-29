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
          // pointer-events-auto: quando TermoComDica está dentro do rótulo
          // de um StatCard com `href`, o conteúdo do card inteiro fica
          // pointer-events-none (ver stat-card.tsx) — só este botão
          // reativa o próprio clique, o resto do rótulo continua "vazando"
          // o clique pro <Link> por baixo. Sem efeito nos demais usos (fora
          // desse contexto, pointer-events já é auto por padrão).
          className="pointer-events-auto inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
          aria-label={`O que é ${info.titulo}?`}
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
