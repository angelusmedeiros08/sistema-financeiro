"use client";

// Controles específicos da página de DRE — Regime + Ano (não usa
// RelatoriosControles porque a DRE não tem Granularidade nem Período livre,
// é sempre "o ano inteiro"; ver lib/relatorios/regime.ts) e o seletor de
// visão (Matriz mensal/Cascata/Indicadores), que não é filtro de dado, é
// modo de exibição — por isso ganha um tratamento visualmente diferente
// (trilho segmentado) em vez do mesmo pill de filtro do Regime.
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CaretLeft, CaretRight, Clock } from "@phosphor-icons/react/dist/ssr";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { GatilhoFiltro } from "@/components/relatorios/gatilho-filtro";
import { cn } from "@/lib/utils";
import type { Regime } from "@/lib/relatorios/regime";

const REGIMES: { valor: Regime; rotulo: string }[] = [
  { valor: "competencia", rotulo: "Competência" },
  { valor: "previsto", rotulo: "Vencimento previsto" },
  { valor: "realizado", rotulo: "Pagamento realizado" },
];

const ABAS = [
  { valor: "matriz", rotulo: "Matriz mensal" },
  { valor: "cascata", rotulo: "Cascata" },
  { valor: "indicadores", rotulo: "Indicadores" },
] as const;

export function DreControles({ regime, ano, aba }: { regime: Regime; ano: number; aba: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function navegarCom(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(chave, valor);
    router.push(`${pathname}?${params.toString()}`);
  }

  const rotuloRegime = REGIMES.find((r) => r.valor === regime)?.rotulo ?? regime;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <GatilhoFiltro icone={Clock} rotulo="Regime" valor={rotuloRegime} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {REGIMES.map((r) => (
              <DropdownMenuCheckboxItem key={r.valor} checked={regime === r.valor} onSelect={() => navegarCom("regime", r.valor)}>
                {r.rotulo}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-0.5 rounded-[10px] border border-border bg-card px-1 py-[3px] shadow-[0_1px_2px_rgba(26,29,31,0.03)]">
          <button
            type="button"
            onClick={() => navegarCom("ano", String(ano - 1))}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Ano anterior"
          >
            <CaretLeft size={12} weight="bold" />
          </button>
          <span className="min-w-[3.5ch] text-center text-xs font-bold tabular-nums text-foreground">{ano}</span>
          <button
            type="button"
            onClick={() => navegarCom("ano", String(ano + 1))}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Próximo ano"
          >
            <CaretRight size={12} weight="bold" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-0.5 rounded-full bg-muted/60 p-1">
        {ABAS.map((a) => (
          <button
            key={a.valor}
            type="button"
            onClick={() => navegarCom("aba", a.valor)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              aba === a.valor ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}
