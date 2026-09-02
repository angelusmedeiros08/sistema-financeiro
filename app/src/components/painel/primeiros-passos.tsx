"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, Circle, X } from "@phosphor-icons/react";
import type { PrimeirosPassos } from "@/app/(app)/painel/dados";
import { cn } from "@/lib/utils";

const PASSOS = [
  { chave: "contaFinanceira" as const, rotulo: "Cadastre uma conta financeira", href: "/configuracoes/contas-financeiras" },
  { chave: "pessoa" as const, rotulo: "Cadastre um cliente ou fornecedor", href: "/clientes/novo" },
  { chave: "lancamento" as const, rotulo: "Registre seu primeiro lançamento", href: "/despesas" },
  { chave: "baixa" as const, rotulo: "Dê baixa num lançamento pendente", href: "/contas-a-receber" },
  { chave: "equipe" as const, rotulo: "Convide alguém da sua equipe", href: "/configuracoes/equipe" },
];

const CHAVE_DISPENSADO = "finanssi:primeiros-passos-dispensado";

export function PrimeirosPassosCard({ passos }: { passos: PrimeirosPassos }) {
  // Lido só no efeito (nunca no primeiro render) de propósito — o primeiro
  // render do cliente precisa bater com o HTML vindo do servidor (que não
  // sabe de localStorage nenhum), senão o React acusa erro de hidratação.
  // O card aparece por uma fração de segundo antes de sumir só na primeira
  // visita depois de dispensar, o mesmo trade-off que sidebar.tsx já aceita
  // pros favoritos.
  const [dispensado, setDispensado] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(CHAVE_DISPENSADO) === "1") setDispensado(true);
    } catch {
      // localStorage indisponível (modo privado restrito) — card continua
      // aparecendo, sem quebrar a página por causa disso.
    }
  }, []);

  function dispensar() {
    setDispensado(true);
    try {
      window.localStorage.setItem(CHAVE_DISPENSADO, "1");
    } catch {
      // Sem persistência (modo privado restrito) — dispensa só nesta
      // visita, volta a aparecer na próxima. Aceitável: não é dado de
      // negócio, é preferência de UI.
    }
  }

  const concluidos = PASSOS.filter((p) => passos[p.chave]).length;
  if (dispensado || concluidos === PASSOS.length) return null;

  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-sm font-bold text-foreground">Primeiros passos</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {concluidos} de {PASSOS.length} concluídos — o essencial pra tirar o máximo do sistema.
          </p>
        </div>
        <button
          type="button"
          onClick={dispensar}
          aria-label="Dispensar primeiros passos"
          title="Dispensar"
          className="shrink-0 rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-1">
        {PASSOS.map((passo) => {
          const feito = passos[passo.chave];
          return (
            <li key={passo.chave}>
              <Link
                href={passo.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors",
                  feito ? "text-muted-foreground" : "font-medium text-foreground hover:bg-muted",
                )}
              >
                {feito ? (
                  <CheckCircle size={18} weight="fill" className="shrink-0 text-positivo" />
                ) : (
                  <Circle size={18} className="shrink-0 text-border" />
                )}
                <span className={cn(feito && "line-through")}>{passo.rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
