"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarBlank, CaretDown, Check, Clock } from "@phosphor-icons/react/dist/ssr";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { GatilhoFiltro } from "@/components/relatorios/gatilho-filtro";
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

function formatarDataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Regime/Visão usam o GatilhoFiltro compartilhado (components/relatorios/
// gatilho-filtro.tsx) — só mostra o valor escolhido, resto fica no menu.
// Antes disso Regime (3) e Visão (5) somavam 8 opções sempre expostas na
// mesma linha, competindo visualmente com a sub-nav logo acima (mesma pill
// laranja preenchida nas duas linhas). Decisão tomada no companion visual,
// 3ª rodada de mockup desta sessão (chat, não tem spec própria).
//
// Controle global de Regime/Granularidade/Período da seção de Relatórios —
// grava tudo na querystring (Seção 3.3 do spec), então cada troca navega
// com os outros parâmetros preservados. O período usa dois campos de data
// porque várias leituras (comparativos, evolução do ponto de equilíbrio)
// precisam de uma janela livre, não só "o mês atual".
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
  const [periodoAberto, setPeriodoAberto] = useState(false);

  function navegarCom(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(chave, valor);
    router.push(`${pathname}?${params.toString()}`);
  }

  function aplicarPeriodo() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("data_inicio", inicio);
    params.set("data_fim", fim);
    router.push(`${pathname}?${params.toString()}`);
    setPeriodoAberto(false);
  }

  const rotuloRegime = REGIMES.find((r) => r.valor === regime)?.rotulo ?? regime;
  const rotuloGranularidade = GRANULARIDADES.find((g) => g.valor === granularidade)?.rotulo ?? granularidade;

  return (
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <GatilhoFiltro icone={CalendarBlank} rotulo="Visão" valor={rotuloGranularidade} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {GRANULARIDADES.map((g) => (
            <DropdownMenuCheckboxItem key={g.valor} checked={granularidade === g.valor} onSelect={() => navegarCom("granularidade", g.valor)}>
              {g.rotulo}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={periodoAberto} onOpenChange={setPeriodoAberto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="group/gatilho flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 py-[7px] text-xs shadow-[0_1px_2px_rgba(26,29,31,0.03)] transition-colors hover:border-primary data-[state=open]:border-primary data-[state=open]:shadow-[0_0_0_3px_rgba(216,88,58,0.12)]"
          >
            <CalendarBlank size={13} className="shrink-0 text-muted-foreground" />
            <span className="font-bold tabular-nums text-foreground">{formatarDataCurta(dataInicio)}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-bold tabular-nums text-foreground">{formatarDataCurta(dataFim)}</span>
            <CaretDown size={11} className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]/gatilho:rotate-180" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto">
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">De</span>
              <input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="rounded-[9px] border border-input bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-primary"
              />
            </label>
            <span className="mb-2 text-muted-foreground">→</span>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">Até</span>
              <input
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="rounded-[9px] border border-input bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-primary"
              />
            </label>
          </div>
          <Button onClick={aplicarPeriodo} size="sm" className="mt-2.5 w-full gap-1.5">
            <Check size={13} weight="bold" />
            Aplicar período
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
