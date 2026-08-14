import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarDREMatriz, buscarDREIndicadores, type LinhaDreMatriz } from "@/lib/relatorios/dre";
import type { Regime } from "@/lib/relatorios/regime";
import { RelatoriosSubNav } from "../sub-nav";
import { WaterfallDre } from "@/components/relatorios/waterfall-dre";
import { IndicadoresDreChart } from "@/components/relatorios/indicadores-dre-chart";
import { formatarMoeda, formatarPercentual } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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

const CLASSE_LINHA: Record<LinhaDreMatriz["tipoCalc"], string> = {
  FOLHA: "text-muted-foreground",
  SUBTOTAL: "bg-muted/40 font-bold",
  SUBTOTAL_ALTERNATIVO: "bg-[#6A56D8]/8 font-bold",
  RESULTADO_NAO_OPERACIONAL: "bg-[#C98A1F]/8 font-bold",
};

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
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
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
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-1 font-heading text-base font-bold text-foreground">Indicadores — evolução no ano</h2>
          <p className="mb-5 text-xs text-muted-foreground">
            Margem de contribuição, margem bruta, EBITDA e margem líquida, todas em % sobre a receita líquida —
            leitura direta das linhas 7, 8, 11 e 20 da matriz, mês a mês.
          </p>
          <IndicadoresDreChart dados={indicadores} altura={420} />
        </div>
      )}

      {aba === "cascata" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-1 font-heading text-base font-bold text-foreground">DRE em cascata — {ano}</h2>
          <p className="mb-5 text-xs text-muted-foreground">Total do ano, linha a linha, na ordem real de tbTotalizadoresDRE.</p>
          <WaterfallDre linhas={linhas.map((l) => ({ rotulo: l.rotulo, tipoCalc: l.tipoCalc, valorDireto: l.total }))} altura={520} />
        </div>
      )}

      {aba === "matriz" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-foreground">DRE — Demonstrativo de Resultado</h2>
            <Link
              href={href({ detalhe: detalhado ? "0" : "1" })}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/70"
            >
              {detalhado ? "Ver resumido" : "Ver detalhado"}
            </Link>
          </div>

          {linhasVisiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma linha de DRE configurada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <th className="sticky left-0 z-10 bg-card py-2 pr-3">Linha</th>
                    {NOMES_MES.map((mes) => (
                      <th key={mes} className="py-2 pr-3 text-right">
                        {mes}
                      </th>
                    ))}
                    <th className="py-2 pr-3 text-right">Total</th>
                    <th className="py-2 text-right">AV%</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasVisiveis.map((linha) => (
                    <tr key={linha.id} className={cn("border-b border-border last:border-none", CLASSE_LINHA[linha.tipoCalc])}>
                      <td className={cn("sticky left-0 z-10 bg-card py-2.5 pr-3 whitespace-nowrap", linha.tipoCalc === "FOLHA" && "pl-4 font-normal")}>
                        {linha.rotulo}
                      </td>
                      {linha.meses.map((valor, i) => (
                        <td key={i} className="py-2.5 pr-3 text-right tabular-nums">
                          {formatarMoeda(valor)}
                        </td>
                      ))}
                      <td className={cn("py-2.5 pr-3 text-right tabular-nums font-semibold", linha.total >= 0 ? "text-[#157F6B]" : "text-[#D8583A]")}>
                        {formatarMoeda(linha.total)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground">{formatarPercentual(linha.avPercentual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
