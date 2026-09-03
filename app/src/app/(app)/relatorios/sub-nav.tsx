"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { PARAM_APRESENTACAO } from "@/lib/apresentacao/sessao";
import { GRUPOS_RELATORIOS as GRUPOS } from "./grupos";

const TODOS_ITENS: { href: string; rotulo: string }[] = [];
for (const grupo of GRUPOS) TODOS_ITENS.push(...grupo.itens);

// Navegação lateral vertical (achado em varredura de design, 03/09/2026:
// o padrão anterior — "rótulo do grupo colado com os itens ao lado, numa
// linha horizontal" — incomodava mesmo depois de ajustar cor/sombra/
// tamanho; mesmo componente aplicado em configuracoes/sub-nav.tsx). Cada
// grupo é um título sozinho na própria linha, itens empilhados abaixo.
// Preserva regime/granularidade/período ao trocar de relatório: o querystring
// atual é anexado a cada link.
export function RelatoriosSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  // Em modo apresentação, a navegação entre relatórios não faz sentido (a
  // ordem já foi definida na apresentação) e só atrapalha o foco no
  // conteúdo — mostra só o nome do relatório atual, sem os links.
  if (searchParams.get(PARAM_APRESENTACAO) !== null) {
    const itemAtivo = TODOS_ITENS.find((item) => pathname.startsWith(item.href));
    return itemAtivo ? <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{itemAtivo.rotulo}</p> : null;
  }

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
                href={query ? `${item.href}?${query}` : item.href}
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
