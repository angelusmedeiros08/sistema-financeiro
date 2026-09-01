"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Warning, ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

// Cobre o que ficar fora do grupo (app) — telas de autenticação, portal
// sem error.tsx próprio, etc. Sem garantia de sessão aqui (pode acontecer
// antes do login), então "voltar" aponta pra raiz, não pro Painel.
export default function ErroRaiz({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/12 text-destructive">
        <Warning size={24} weight="bold" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-bold text-foreground">Algo deu errado</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Já ficamos sabendo do problema. Tente de novo — se continuar acontecendo, volte pro início.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={reset}>
          <ArrowClockwise size={14} />
          Tentar novamente
        </Button>
        <Button asChild size="sm">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
