import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarFluxoCaixaGrade, buscarPrevistoRealizado } from "@/lib/relatorios/fluxo-caixa";
import { RelatoriosSubNav } from "../sub-nav";
import { RelatoriosControles } from "../controles";
import { ComparativoBarras } from "@/components/relatorios/comparativo-barras";
import { formatarMoeda } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

const ABAS = [
  { valor: "diario", rotulo: "Diário" },
  { valor: "previsto_realizado", rotulo: "Previsto × Realizado" },
] as const;

export default async function PaginaRelatoriosFluxoCaixa({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const params = lerParametrosRelatorio(sp);
  const aba = sp.aba === "previsto_realizado" ? "previsto_realizado" : "diario";

  const supabase = await createClient();

  function hrefAba(valor: string) {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]);
    p.set("aba", valor);
    return `/relatorios/fluxo-caixa?${p.toString()}`;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
      <RelatoriosSubNav />
      <RelatoriosControles {...params} />

      <div className="flex gap-1">
        {ABAS.map((a) => (
          <Link
            key={a.valor}
            href={hrefAba(a.valor)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              aba === a.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {a.rotulo}
          </Link>
        ))}
      </div>

      {aba === "diario" ? (
        <FluxoDiario tenantId={contexto.tenantId} params={params} supabase={supabase} />
      ) : (
        <FluxoPrevistoRealizado tenantId={contexto.tenantId} params={params} supabase={supabase} />
      )}
    </div>
  );
}

async function FluxoDiario({
  tenantId,
  params,
  supabase,
}: {
  tenantId: string;
  params: ReturnType<typeof lerParametrosRelatorio>;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const pontos = await buscarFluxoCaixaGrade(supabase, { tenantId, ...params });

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 font-heading text-sm font-bold text-foreground">Entradas × Saídas</h2>
        <ComparativoBarras
          dados={pontos.map((p) => ({ chave: p.chave, entradas: p.entradas, saidas: -p.saidas }))}
          eixoX="chave"
          series={[
            { chave: "entradas", nome: "Entradas", cor: "#157F6B" },
            { chave: "saidas", nome: "Saídas", cor: "#D8583A" },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="p-3">Período</th>
              <th className="p-3 text-right">Entradas</th>
              <th className="p-3 text-right">Saídas</th>
              <th className="p-3 text-right">Saldo do período</th>
              <th className="p-3 text-right">Saldo acumulado</th>
            </tr>
          </thead>
          <tbody>
            {pontos.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Sem movimentação no período selecionado.
                </td>
              </tr>
            ) : (
              pontos.map((p) => (
                <tr key={p.chave} className="border-b border-border last:border-none">
                  <td className="p-3 font-medium text-foreground">{p.chave}</td>
                  <td className="p-3 text-right tabular-nums text-[#157F6B]">{formatarMoeda(p.entradas)}</td>
                  <td className="p-3 text-right tabular-nums text-[#D8583A]">{formatarMoeda(p.saidas)}</td>
                  <td className={cn("p-3 text-right tabular-nums font-semibold", p.saldoPeriodo >= 0 ? "text-[#157F6B]" : "text-[#D8583A]")}>
                    {formatarMoeda(p.saldoPeriodo)}
                  </td>
                  <td className="p-3 text-right tabular-nums">{formatarMoeda(p.saldoAcumulado)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function FluxoPrevistoRealizado({
  tenantId,
  params,
  supabase,
}: {
  tenantId: string;
  params: ReturnType<typeof lerParametrosRelatorio>;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const pontos = await buscarPrevistoRealizado(supabase, {
    tenantId,
    granularidade: params.granularidade,
    dataInicio: params.dataInicio,
    dataFim: params.dataFim,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 font-heading text-sm font-bold text-foreground">Vencimento previsto × Pagamento realizado</h2>
        <ComparativoBarras
          dados={pontos}
          eixoX="chave"
          series={[
            { chave: "previsto", nome: "Previsto", cor: "#157F6B" },
            { chave: "realizado", nome: "Realizado", cor: "#6A56D8" },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="p-3">Período</th>
              <th className="p-3 text-right">Previsto</th>
              <th className="p-3 text-right">Realizado</th>
              <th className="p-3 text-right">Variação</th>
            </tr>
          </thead>
          <tbody>
            {pontos.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Sem movimentação no período selecionado.
                </td>
              </tr>
            ) : (
              pontos.map((p) => (
                <tr key={p.chave} className="border-b border-border last:border-none">
                  <td className="p-3 font-medium text-foreground">{p.chave}</td>
                  <td className="p-3 text-right tabular-nums text-[#157F6B]">{formatarMoeda(p.previsto)}</td>
                  <td className="p-3 text-right tabular-nums text-[#6A56D8]">{formatarMoeda(p.realizado)}</td>
                  <td className={cn("p-3 text-right tabular-nums font-semibold", p.variacao >= 0 ? "text-[#157F6B]" : "text-[#D8583A]")}>
                    {formatarMoeda(p.variacao)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
