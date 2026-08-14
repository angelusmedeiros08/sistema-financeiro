"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Regime, Granularidade } from "@/lib/relatorios/regime";

const REGIMES: { valor: Regime; rotulo: string }[] = [
  { valor: "competencia", rotulo: "Competência" },
  { valor: "previsto", rotulo: "Vencimento previsto" },
  { valor: "realizado", rotulo: "Pagamento realizado" },
];

const GRANULARIDADES: { valor: Granularidade; rotulo: string }[] = [
  { valor: "dia", rotulo: "Dia" },
  { valor: "semana", rotulo: "Semana" },
  { valor: "mes", rotulo: "Mês" },
  { valor: "trimestre", rotulo: "Trimestre" },
  { valor: "ano", rotulo: "Ano" },
];

function Pilula({ ativo, children }: { ativo: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        ativo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </span>
  );
}

// Controle global de Regime/Granularidade/Período da seção de Relatórios —
// grava tudo na querystring (Seção 3.3 do spec), então cada troca é só um
// link com os outros parâmetros preservados. O período usa dois campos de
// data porque várias leituras (comparativos, evolução do ponto de
// equilíbrio) precisam de uma janela livre, não só "o mês atual".
export function RelatoriosControles({
  regime,
  granularidade,
  dataInicio,
  dataFim,
}: {
  regime: Regime;
  granularidade: Granularidade;
  dataInicio: string;
  dataFim: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inicio, setInicio] = useState(dataInicio);
  const [fim, setFim] = useState(dataFim);

  function hrefCom(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(chave, valor);
    return `${pathname}?${params.toString()}`;
  }

  function aplicarPeriodo() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("data_inicio", inicio);
    params.set("data_fim", fim);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Regime</span>
        <div className="flex gap-1">
          {REGIMES.map((r) => (
            <Link key={r.valor} href={hrefCom("regime", r.valor)}>
              <Pilula ativo={regime === r.valor}>{r.rotulo}</Pilula>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Visão</span>
        <div className="flex gap-1">
          {GRANULARIDADES.map((g) => (
            <Link key={g.valor} href={hrefCom("granularidade", g.valor)}>
              <Pilula ativo={granularidade === g.valor}>{g.rotulo}</Pilula>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Período</span>
        <input
          type="date"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          className="rounded-lg border border-input bg-transparent px-2 py-1 text-xs"
        />
        <span className="text-xs text-muted-foreground">até</span>
        <input
          type="date"
          value={fim}
          onChange={(e) => setFim(e.target.value)}
          className="rounded-lg border border-input bg-transparent px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={aplicarPeriodo}
          className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
