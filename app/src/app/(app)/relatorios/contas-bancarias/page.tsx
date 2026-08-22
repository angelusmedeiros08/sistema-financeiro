import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarContasBancarias } from "@/lib/relatorios/contas-bancarias";
import { RelatoriosSubNav } from "../sub-nav";
import { RelatoriosControles } from "../controles";
import { StatCard } from "@/components/painel/stat-card";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { formatarMoeda, formatarNumeroCompacto } from "@/lib/formatacao";
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
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
      <RelatoriosSubNav />
      <RelatoriosControles {...params} />

      <StatCard variant="hero" label="Saldo total em contas ativas" valor={formatarMoeda(saldoTotal)} />

      {contas.length === 0 ? (
        <EstadoVazio texto="Nenhuma conta financeira ativa cadastrada." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {contas.map((c) => (
            <div key={c.contaFinanceiraId} className="rounded-2xl bg-card shadow-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-heading text-sm font-bold text-foreground">{c.nome}</h2>
                <span className="text-lg font-bold tabular-nums text-foreground">{formatarMoeda(c.saldoAcumulado)}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Crédito no período</p>
                  <p className="font-semibold tabular-nums text-[#157F6B]">{formatarNumeroCompacto(c.credito)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Débito no período</p>
                  <p className="font-semibold tabular-nums text-[#B23A2E]">{formatarNumeroCompacto(c.debito)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo do período</p>
                  <p className={cn("font-semibold tabular-nums", c.saldoPeriodo >= 0 ? "text-[#157F6B]" : "text-[#B23A2E]")}>
                    {formatarNumeroCompacto(c.saldoPeriodo)}
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
