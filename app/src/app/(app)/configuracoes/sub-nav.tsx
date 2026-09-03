"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GRUPOS_CONFIGURACOES as GRUPOS } from "./grupos";

// Navegação lateral vertical (achado em varredura de design, 03/09/2026:
// o padrão anterior — "rótulo do grupo colado com os itens ao lado, numa
// linha horizontal" — incomodava mesmo depois de ajustar cor/sombra/
// tamanho). Cada grupo agora é um título sozinho na própria linha, com os
// itens empilhados abaixo — mesmo padrão de configurações do GitHub/
// Linear/Stripe. Renderizada por configuracoes/layout.tsx como coluna
// fixa ao lado do conteúdo (nunca mais acima dele).
export function ConfiguracoesSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-52 shrink-0 flex-col gap-5">
      {GRUPOS.map((grupo) => (
        <div key={grupo.rotulo} className="flex flex-col gap-0.5">
          <h2 className="mb-1 border-b border-border px-2.5 pb-1.5 text-[11px] font-bold tracking-wider text-foreground/80 uppercase">
            {grupo.rotulo}
          </h2>
          {grupo.itens.map((item) => {
            const ativo = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                  ativo ? "bg-primary/12 font-semibold text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {item.rotulo}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
