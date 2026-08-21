import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarDREMatriz, buscarDREIndicadores } from "@/lib/relatorios/dre";
import type { Regime } from "@/lib/relatorios/regime";
import { RelatoriosSubNav } from "../sub-nav";
import { WaterfallDre } from "@/components/relatorios/waterfall-dre";
import { IndicadoresDreChart } from "@/components/relatorios/indicadores-dre-chart";
import { DreMatrizTabela } from "@/components/relatorios/dre-matriz-tabela";
import { cn } from "@/lib/utils";

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

export default async function PaginaRelatoriosDre({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const regime: Regime = REGIMES.some((r) => r.valor === sp.regime) ? (sp.regime as Regime) : "competencia";
  const ano = Number(sp.ano) || new Date().getFullYear();
  const detalhado = sp.detalhe !== "0";
  const aba = ABAS.some((a) => a.valor === sp.aba) ? sp.aba! : "matriz";

  const supabase = await createClient();
  const [linhas, indicadores] = await Promise.all([
    buscarDREMatriz(supabase, { tenantId: contexto.tenantId, regime, ano }),
    buscarDREIndicadores(supabase, { tenantId: contexto.tenantId, regime, ano }),
  ]);
  const linhasVisiveis = detalhado ? linhas : linhas.filter((l) => l.tipoCalc !== "FOLHA");

  function href(overrides: Record<string, string>) {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]);
    for (const [chave, valor] of Object.entries(overrides)) p.set(chave, valor);
    return `/relatorios/dre?${p.toString()}`;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
        <Link href="/configuracoes/estrutura-dre" className="text-xs font-semibold text-primary hover:underline">
          Configurar estrutura da DRE
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

      {/* Sub-módulo do DRE: cada visualização vive na sua própria aba, com o
          canvas inteiro pra ela — 23 linhas reais não cabem legíveis
          dividindo espaço com outras duas seções na mesma tela. */}
      <div className="flex gap-1">
        {ABAS.map((a) => (
          <Link
            key={a.valor}
            href={href({ aba: a.valor })}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              aba === a.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {a.rotulo}
          </Link>
        ))}
      </div>

      {aba === "indicadores" && (
        <div className="rounded-2xl bg-card shadow-card p-6">
          <h2 className="mb-1 font-heading text-base font-bold text-foreground">Indicadores: evolução no ano</h2>
          <p className="mb-5 text-xs text-muted-foreground">
            Margem de contribuição, margem bruta, EBITDA e margem líquida, todas em % sobre a receita líquida.
            Leitura direta das linhas 7, 8, 11 e 20 da matriz, mês a mês.
          </p>
          <IndicadoresDreChart dados={indicadores} altura={420} />
        </div>
      )}

      {aba === "cascata" && (
        <div className="rounded-2xl bg-card shadow-card p-6">
          <h2 className="mb-1 font-heading text-base font-bold text-foreground">DRE em cascata ({ano})</h2>
          <p className="mb-5 text-xs text-muted-foreground">Total do ano, linha a linha, na ordem real de tbTotalizadoresDRE.</p>
          <WaterfallDre linhas={linhas.map((l) => ({ rotulo: l.rotulo, tipoCalc: l.tipoCalc, valorDireto: l.total }))} altura={520} />
        </div>
      )}

      {aba === "matriz" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Link
              href={href({ detalhe: detalhado ? "0" : "1" })}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/70"
            >
              {detalhado ? "Ver resumido" : "Ver detalhado"}
            </Link>
          </div>

          {linhasVisiveis.length === 0 ? (
            <div className="rounded-2xl bg-card shadow-card p-6">
              <p className="text-sm text-muted-foreground">Nenhuma linha de DRE configurada ainda.</p>
            </div>
          ) : (
            <DreMatrizTabela linhas={linhasVisiveis} ano={ano} />
          )}
        </div>
      )}
    </div>
  );
}
