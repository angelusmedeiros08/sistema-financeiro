"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChartBar } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { PARAM_APRESENTACAO } from "@/lib/apresentacao/sessao";
import { GRUPOS_RELATORIOS as GRUPOS } from "./grupos";

const TODOS_ITENS: { href: string; rotulo: string }[] = [];
for (const grupo of GRUPOS) TODOS_ITENS.push(...grupo.itens);

// PRÉVIA (04/09/2026): rail recolhido + hover, pra não tomar largura da
// tabela nas telas de matriz (achado do usuário — DRE com muitas colunas
// de mês ficava apertada com os 208px fixos da lista). Mesmo mecanismo de
// hover já aprovado na sidebar principal (sidebar.tsx), só que aqui a
// sobreposição é `absolute` (relativa ao próprio container, não `fixed` —
// esta nav vive dentro do fluxo normal da página, não precisa ficar presa
// na viewport ao rolar).
export function RelatoriosSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const [aberta, setAberta] = useState(false);
  const timerAbrir = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerFechar = useRef<ReturnType<typeof setTimeout> | null>(null);

  function limparTimers() {
    if (timerAbrir.current) clearTimeout(timerAbrir.current);
    if (timerFechar.current) clearTimeout(timerFechar.current);
  }
  function agendarAbrir() {
    limparTimers();
    timerAbrir.current = setTimeout(() => setAberta(true), 100);
  }
  function agendarFechar() {
    limparTimers();
    timerFechar.current = setTimeout(() => setAberta(false), 200);
  }

  // Em modo apresentação, a navegação entre relatórios não faz sentido (a
  // ordem já foi definida na apresentação) e só atrapalha o foco no
  // conteúdo — mostra só o nome do relatório atual, sem os links.
  if (searchParams.get(PARAM_APRESENTACAO) !== null) {
    const itemAtivo = TODOS_ITENS.find((item) => pathname.startsWith(item.href));
    return itemAtivo ? <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{itemAtivo.rotulo}</p> : null;
  }

  const itemAtivo = TODOS_ITENS.find((item) => pathname.startsWith(item.href));

  return (
    <div className="relative shrink-0" onMouseEnter={agendarAbrir} onMouseLeave={agendarFechar}>
      {/* Rail: sempre visível, reserva só o espaço estreito no fluxo normal. */}
      <div
        title={`Relatórios — ${itemAtivo?.rotulo ?? ""}`}
        className="flex w-11 flex-col items-center gap-2 rounded-lg border border-border bg-card py-3"
      >
        <ChartBar size={18} weight="bold" className="text-primary" />
        <span className="h-1 w-1 rounded-full bg-primary" />
      </div>

      {/* Painel expandido: sobrepõe o conteúdo ao passar o mouse, nunca empurra a tabela. */}
      <div
        className={cn(
          "absolute top-0 left-0 z-20 w-52 rounded-lg border border-border bg-card p-3 shadow-2xl transition-[opacity,transform] duration-150",
          aberta ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none -translate-x-1 opacity-0",
        )}
      >
        <nav className="flex flex-col gap-5">
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
      </div>
    </div>
  );
}
