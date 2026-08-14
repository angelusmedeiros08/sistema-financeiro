import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarPontoEquilibrio, buscarEvolucaoPontoEquilibrio, mesesDoAno, type BaseMC } from "@/lib/relatorios/ponto-equilibrio";
import type { Regime } from "@/lib/relatorios/regime";
import { RelatoriosSubNav } from "../sub-nav";
import { EvolucaoPontoEquilibrioChart } from "@/components/relatorios/evolucao-ponto-equilibrio-chart";
import { formatarMoeda, formatarPercentual } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

const REGIMES: { valor: Regime; rotulo: string }[] = [
  { valor: "competencia", rotulo: "Competência" },
  { valor: "previsto", rotulo: "Vencimento previsto" },
  { valor: "realizado", rotulo: "Pagamento realizado" },
];

const BASES_MC: { valor: BaseMC; rotulo: string }[] = [
  { valor: "receita_liquida", rotulo: "Receita líquida" },
  { valor: "receita_operacional", rotulo: "Receita operacional" },
];

export default async function PaginaRelatoriosPontoEquilibrio({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const regime: Regime = REGIMES.some((r) => r.valor === sp.regime) ? (sp.regime as Regime) : "competencia";
  const baseMC: BaseMC = BASES_MC.some((b) => b.valor === sp.base) ? (sp.base as BaseMC) : "receita_liquida";
  const ano = Number(sp.ano) || new Date().getFullYear();

  const supabase = await createClient();
  const meses = mesesDoAno(ano);
  const [pontoAtual, evolucao] = await Promise.all([
    buscarPontoEquilibrio(supabase, {
      tenantId: contexto.tenantId,
      regime,
      baseMC,
      dataInicio: meses[new Date().getMonth()]?.inicio ?? meses[0].inicio,
      dataFim: meses[new Date().getMonth()]?.fim ?? meses[0].fim,
    }),
    buscarEvolucaoPontoEquilibrio(supabase, { tenantId: contexto.tenantId, regime, baseMC, meses }),
  ]);

  const margemDeSeguranca = pontoAtual.receitaTotal - pontoAtual.pontoEquilibrio;
  const margemDeSegurancaPercentual = pontoAtual.receitaTotal > 0 ? margemDeSeguranca / pontoAtual.receitaTotal : 0;

  function href(overrides: Record<string, string>) {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]);
    for (const [chave, valor] of Object.entries(overrides)) p.set(chave, valor);
    return `/relatorios/ponto-equilibrio?${p.toString()}`;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
      <RelatoriosSubNav />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Regime</span>
          <div className="flex gap-1">
            {REGIMES.map((r) => (
              <Link key={r.valor} href={href({ regime: r.valor })}>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    regime === r.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {r.rotulo}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Base da MC%</span>
          <div className="flex gap-1">
            {BASES_MC.map((b) => (
              <Link key={b.valor} href={href({ base: b.valor })}>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    baseMC === b.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {b.rotulo}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Ano</span>
          <Link href={href({ ano: String(ano - 1) })} className="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">
            ‹
          </Link>
          <span className="text-sm font-bold tabular-nums text-foreground">{ano}</span>
          <Link href={href({ ano: String(ano + 1) })} className="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">
            ›
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Ponto de equilíbrio (mês atual)</p>
          <p className="text-xl font-bold tabular-nums text-foreground">{formatarMoeda(pontoAtual.pontoEquilibrio)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Margem de contribuição</p>
          <p className="text-xl font-bold tabular-nums text-[#157F6B]">{formatarPercentual(pontoAtual.margemContribuicaoPercentual)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Margem de segurança</p>
          <p className={cn("text-xl font-bold tabular-nums", margemDeSeguranca >= 0 ? "text-[#157F6B]" : "text-[#D8583A]")}>
            {formatarMoeda(margemDeSeguranca)}
          </p>
          <p className="text-xs text-muted-foreground">{formatarPercentual(margemDeSegurancaPercentual)} acima do ponto de equilíbrio</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-1 font-heading text-base font-bold text-foreground">Evolução no ano ({ano})</h2>
        <p className="mb-5 text-xs text-muted-foreground">
          Ponto de equilíbrio em R$ e margem de contribuição em %, mês a mês. PE = Custos fixos ÷ MC%, calculada sobre{" "}
          {baseMC === "receita_liquida" ? "Receita líquida" : "Receita operacional"}.
        </p>
        <EvolucaoPontoEquilibrioChart dados={evolucao} />
      </div>
    </div>
  );
}
