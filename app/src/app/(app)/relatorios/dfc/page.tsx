import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarDFCMatriz, buscarFluxoSankey } from "@/lib/relatorios/dfc";
import { RelatoriosSubNav } from "../sub-nav";
import { SankeyFluxoCaixa } from "@/components/relatorios/sankey-fluxo-caixa";
import { formatarNumeroCompacto } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function PaginaRelatoriosDfc({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const ano = Number(sp.ano) || new Date().getFullYear();

  const supabase = await createClient();
  const [linhas, fluxoSankey] = await Promise.all([
    buscarDFCMatriz(supabase, { tenantId: contexto.tenantId, ano }),
    buscarFluxoSankey(supabase, { tenantId: contexto.tenantId, ano }),
  ]);

  function href(overrides: Record<string, string>) {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]);
    for (const [chave, valor] of Object.entries(overrides)) p.set(chave, valor);
    return `/relatorios/dfc?${p.toString()}`;
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

      <div className="rounded-2xl bg-card shadow-card p-6">
        <div className="mb-4">
          <h2 className="font-heading text-base font-bold text-foreground">Composição do fluxo de caixa realizado</h2>
          <p className="text-xs text-muted-foreground">De onde a receita veio e pra onde ela foi no ano — o que a matriz abaixo, por atividade, não mostra.</p>
        </div>
        <SankeyFluxoCaixa fluxo={fluxoSankey} />
      </div>

      <div className="rounded-2xl bg-card shadow-card p-6">
        <div className="mb-4">
          <h2 className="font-heading text-base font-bold text-foreground">DFC: Fluxo de Caixa por atividade</h2>
          <p className="text-xs text-muted-foreground">
            Previsto (vencimento) × Realizado (pagamento) por mês, nas atividades Operacional, Investimento e Financiamento. Reclassifique linhas
            da DRE em Configurações → Estrutura de DRE.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                <th className="sticky left-0 z-10 w-44 bg-card py-1.5 pr-2">Atividade</th>
                {NOMES_MES.map((mes) => (
                  <th key={mes} colSpan={3} className="border-l border-border py-1.5 px-1.5 text-center">
                    {mes}
                  </th>
                ))}
                <th colSpan={3} className="border-l border-border py-1.5 px-1.5 text-center">
                  Total
                </th>
              </tr>
              <tr className="border-b border-border text-left text-[10px] font-semibold text-muted-foreground">
                <th className="sticky left-0 z-10 w-44 bg-card"></th>
                {NOMES_MES.map((mes) => (
                  <Fragment key={mes}>
                    <th className="border-l border-border py-1 px-1 text-right">Prev.</th>
                    <th className="py-1 px-1 text-right">Real.</th>
                    <th className="py-1 px-1 text-right">Var.</th>
                  </Fragment>
                ))}
                <th className="border-l border-border py-1 px-1 text-right">Prev.</th>
                <th className="py-1 px-1 text-right">Real.</th>
                <th className="py-1 px-1 text-right">Var.</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => {
                const ehGeracaoCaixa = linha.atividade === "GERACAO_CAIXA";
                const variacaoTotal = linha.totalRealizado - linha.totalPrevisto;
                return (
                  <tr key={linha.atividade} className={cn("border-b border-border last:border-none", ehGeracaoCaixa && "bg-muted/40 font-bold")}>
                    <td className="sticky left-0 z-10 w-44 truncate bg-card py-1.5 pr-2">{linha.rotulo}</td>
                    {linha.mesesPrevisto.map((previsto, i) => {
                      const realizado = linha.mesesRealizado[i];
                      const variacao = realizado - previsto;
                      return (
                        <Fragment key={i}>
                          <td className="border-l border-border py-1.5 px-1 text-right tabular-nums text-muted-foreground">
                            {formatarNumeroCompacto(previsto)}
                          </td>
                          <td className="py-1.5 px-1 text-right tabular-nums">{formatarNumeroCompacto(realizado)}</td>
                          <td className={cn("py-1.5 px-1 text-right tabular-nums", variacao >= 0 ? "text-[#157F6B]" : "text-[#B23A2E]")}>
                            {formatarNumeroCompacto(variacao)}
                          </td>
                        </Fragment>
                      );
                    })}
                    <td className="border-l border-border py-1.5 px-1 text-right tabular-nums font-semibold text-muted-foreground">
                      {formatarNumeroCompacto(linha.totalPrevisto)}
                    </td>
                    <td className="py-1.5 px-1 text-right tabular-nums font-semibold">{formatarNumeroCompacto(linha.totalRealizado)}</td>
                    <td className={cn("py-1.5 px-1 text-right tabular-nums font-semibold", variacaoTotal >= 0 ? "text-[#157F6B]" : "text-[#B23A2E]")}>
                      {formatarNumeroCompacto(variacaoTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
