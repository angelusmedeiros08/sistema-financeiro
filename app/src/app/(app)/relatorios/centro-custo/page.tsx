import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarCentroCusto } from "@/lib/relatorios/centro-custo";
import { RelatoriosSubNav } from "../sub-nav";
import { RelatoriosControles } from "../controles";
import { TrilhoBarra } from "@/components/relatorios/trilho-barra";
import { CentroCustoTabela } from "@/components/relatorios/centro-custo-tabela";
import { formatarMoeda } from "@/lib/formatacao";
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
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
      <RelatoriosSubNav />
      <RelatoriosControles {...params} />

      {linhas.length > 0 && (
        <div className="rounded-2xl bg-card shadow-card p-5">
          <h2 className="mb-4 font-heading text-sm font-bold text-foreground">Resultado por centro de custo</h2>
          <div className="flex flex-col gap-2.5">
            {linhas.map((l) => (
              <div key={l.centroCustoId} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-xs font-medium text-foreground">{l.nome}</span>
                <TrilhoBarra
                  valorPercentual={Math.abs(l.saldo) / maiorSaldoAbsoluto}
                  cor={l.saldo >= 0 ? "#157F6B" : "#B23A2E"}
                  valorFormatado={formatarMoeda(l.saldo)}
                />
                <span className={cn("w-28 shrink-0 text-right text-xs font-semibold tabular-nums", l.saldo >= 0 ? "text-[#157F6B]" : "text-[#B23A2E]")}>
                  {formatarMoeda(l.saldo)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <CentroCustoTabela linhas={linhas} />
    </div>
  );
}
