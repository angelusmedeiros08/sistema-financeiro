import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarCentroCusto } from "@/lib/relatorios/centro-custo";
import { RelatoriosSubNav } from "../sub-nav";
import { RelatoriosControles } from "../controles";
import { formatarMoeda, formatarPercentual } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

export default async function PaginaRelatoriosCentroCusto({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const params = lerParametrosRelatorio(await searchParams);
  const supabase = await createClient();
  const linhas = await buscarCentroCusto(supabase, { tenantId: contexto.tenantId, ...params });
  const maiorSaldoAbsoluto = Math.max(...linhas.map((l) => Math.abs(l.saldo)), 1);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
      <RelatoriosSubNav />
      <RelatoriosControles {...params} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 font-heading text-sm font-bold text-foreground">Resultado por centro de custo</h2>

        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum lançamento rateado por centro de custo no período selecionado.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2.5">
              {linhas.map((l) => (
                <div key={l.centroCustoId} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-xs font-medium text-foreground">{l.nome}</span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", l.saldo >= 0 ? "bg-[#157F6B]" : "bg-[#D8583A]")}
                      style={{ width: `${Math.max(4, (Math.abs(l.saldo) / maiorSaldoAbsoluto) * 100)}%` }}
                    />
                  </div>
                  <span className={cn("w-28 shrink-0 text-right text-xs font-semibold tabular-nums", l.saldo >= 0 ? "text-[#157F6B]" : "text-[#D8583A]")}>
                    {formatarMoeda(l.saldo)}
                  </span>
                </div>
              ))}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Centro de custo</th>
                  <th className="py-2 text-right">Entradas</th>
                  <th className="py-2 text-right">Saídas</th>
                  <th className="py-2 text-right">Saldo</th>
                  <th className="py-2 text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.centroCustoId} className="border-b border-border last:border-none">
                    <td className="py-2.5 font-medium text-foreground">{l.nome}</td>
                    <td className="py-2.5 text-right tabular-nums text-[#157F6B]">{formatarMoeda(l.entradas)}</td>
                    <td className="py-2.5 text-right tabular-nums text-[#D8583A]">{formatarMoeda(l.saidas)}</td>
                    <td className={cn("py-2.5 text-right tabular-nums font-semibold", l.saldo >= 0 ? "text-[#157F6B]" : "text-[#D8583A]")}>
                      {formatarMoeda(l.saldo)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">{formatarPercentual(l.margemPercentual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
