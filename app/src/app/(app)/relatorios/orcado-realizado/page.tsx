import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarOrcadoRealizado } from "@/lib/orcamento/orcamento";
import type { Regime } from "@/lib/relatorios/regime";
import { RelatoriosSubNav } from "../sub-nav";
import { OrcadoRealizadoBarras } from "@/components/relatorios/orcado-realizado-barras";
import { cn } from "@/lib/utils";

const REGIMES: { valor: Regime; rotulo: string }[] = [
  { valor: "competencia", rotulo: "Competência" },
  { valor: "previsto", rotulo: "Vencimento previsto" },
  { valor: "realizado", rotulo: "Pagamento realizado" },
];

export default async function PaginaRelatoriosOrcadoRealizado({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const regime: Regime = REGIMES.some((r) => r.valor === sp.regime) ? (sp.regime as Regime) : "competencia";
  const ano = Number(sp.ano) || new Date().getFullYear();

  const supabase = await createClient();
  const linhas = await buscarOrcadoRealizado(supabase, { tenantId: contexto.tenantId, ano, regime });
  const receitas = linhas.filter((l) => l.tipo === "RECEITA");
  const despesas = linhas.filter((l) => l.tipo === "DESPESA");

  function href(overrides: Record<string, string>) {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]);
    for (const [chave, valor] of Object.entries(overrides)) p.set(chave, valor);
    return `/relatorios/orcado-realizado?${p.toString()}`;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
        <Link href="/configuracoes/orcamento" className="text-xs font-semibold text-primary hover:underline">
          Cadastrar meta de orçamento
        </Link>
      </div>
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

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-heading text-base font-bold text-foreground">Receitas</h2>
        <OrcadoRealizadoBarras linhas={receitas} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-heading text-base font-bold text-foreground">Despesas</h2>
        <OrcadoRealizadoBarras linhas={despesas} />
      </div>
    </div>
  );
}
