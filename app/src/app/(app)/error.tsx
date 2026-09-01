"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Warning, ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

// Substitui só o `{children}` da rota atual — sidebar e topbar do layout
// autenticado continuam de pé, então quem cair aqui nunca perde a
// navegação. Nunca mostra código HTTP nem stack trace como conteúdo
// principal (achado da pesquisa: assusta usuário não-técnico e não ajuda
// em nada quem não é dev) — só loga no console pra quem for debugar.
export default function ErroApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/12 text-destructive">
        <Warning size={24} weight="bold" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-bold text-foreground">Algo deu errado</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Já ficamos sabendo do problema. Tente de novo — se continuar acontecendo, volte pro Painel e tente pelo caminho normal.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={reset}>
          <ArrowClockwise size={14} />
          Tentar novamente
        </Button>
        <Button asChild size="sm">
          <Link href="/painel">Voltar ao Painel</Link>
        </Button>
      </div>
    </div>
  );
}
