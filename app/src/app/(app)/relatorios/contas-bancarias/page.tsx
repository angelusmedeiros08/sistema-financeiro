import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarContasBancarias } from "@/lib/relatorios/contas-bancarias";
import { RelatoriosSubNav } from "../sub-nav";
import { RelatoriosControles } from "../controles";
import { StatCard } from "@/components/painel/stat-card";
import { formatarMoeda } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

export default async function PaginaRelatoriosContasBancarias({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const params = lerParametrosRelatorio(await searchParams);
  const supabase = await createClient();
  const contas = await buscarContasBancarias(supabase, { tenantId: contexto.tenantId, ...params });
  const saldoTotal = contas.reduce((soma, c) => soma + c.saldoAcumulado, 0);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
      <RelatoriosSubNav />
      <RelatoriosControles {...params} />

      <StatCard variant="hero" label="Saldo total em contas ativas" valor={formatarMoeda(saldoTotal)} />

      {contas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma conta financeira ativa cadastrada.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {contas.map((c) => (
            <div key={c.contaFinanceiraId} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-heading text-sm font-bold text-foreground">{c.nome}</h2>
                <span className="text-lg font-bold tabular-nums text-foreground">{formatarMoeda(c.saldoAcumulado)}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 border-t border-border pt-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Crédito no período</p>
                  <p className="font-semibold tabular-nums text-[#157F6B]">{formatarMoeda(c.credito)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Débito no período</p>
                  <p className="font-semibold tabular-nums text-[#D8583A]">{formatarMoeda(c.debito)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo do período</p>
                  <p className={cn("font-semibold tabular-nums", c.saldoPeriodo >= 0 ? "text-[#157F6B]" : "text-[#D8583A]")}>
                    {formatarMoeda(c.saldoPeriodo)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
