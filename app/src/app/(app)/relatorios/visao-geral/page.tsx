import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarDRE } from "@/lib/relatorios/dre";
import { buscarFluxoCaixaGrade } from "@/lib/relatorios/fluxo-caixa";
import { buscarPontoEquilibrio } from "@/lib/relatorios/ponto-equilibrio";
import { buscarAging, buscarResumoVencimentos } from "@/lib/relatorios/aging";
import { RelatoriosSubNav } from "../sub-nav";
import { RelatoriosControles } from "../controles";
import { StatCard } from "@/components/painel/stat-card";
import { FluxoChart } from "@/components/painel/fluxo-chart";
import { WaterfallDre } from "@/components/relatorios/waterfall-dre";
import { AgingBarras } from "@/components/relatorios/aging-barras";
import { formatarMoeda, formatarPercentual } from "@/lib/formatacao";

export default async function PaginaRelatoriosVisaoGeral({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");
  const { tenantId } = contexto;

  const params = lerParametrosRelatorio(await searchParams);
  const supabase = await createClient();

  const [dre, fluxo, pontoEquilibrio, agingReceita, agingDespesa, resumoReceber, resumoPagar] = await Promise.all([
    buscarDRE(supabase, { tenantId, ...params }),
    buscarFluxoCaixaGrade(supabase, { tenantId, ...params }),
    buscarPontoEquilibrio(supabase, { tenantId, ...params }),
    buscarAging(supabase, { tenantId, tipo: "RECEITA" }),
    buscarAging(supabase, { tenantId, tipo: "DESPESA" }),
    buscarResumoVencimentos(supabase, { tenantId, tipo: "RECEITA" }),
    buscarResumoVencimentos(supabase, { tenantId, tipo: "DESPESA" }),
  ]);

  const resultado = dre.at(-1)?.valorAcumulado ?? 0;
  const fluxoParaGrafico = fluxo.map((p) => ({ mes: p.chave, resultado: p.saldoPeriodo }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
      </div>

      <RelatoriosSubNav />
      <RelatoriosControles {...params} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          variant="hero"
          label="Resultado do período"
          valor={formatarMoeda(resultado)}
        />
        <StatCard
          variant="coral"
          label="A receber vencido"
          valor={formatarMoeda(resumoReceber.vencidoTotal)}
          detalhe={`Vence hoje: ${formatarMoeda(resumoReceber.venceHojeTotal)}`}
        />
        <StatCard
          variant="ambar"
          label="A pagar vencido"
          valor={formatarMoeda(resumoPagar.vencidoTotal)}
          detalhe={`Vence hoje: ${formatarMoeda(resumoPagar.venceHojeTotal)}`}
        />
        <StatCard
          variant="teal"
          label="Ponto de equilíbrio"
          valor={formatarMoeda(pontoEquilibrio.pontoEquilibrio)}
          detalhe={`Margem de contribuição: ${formatarPercentual(pontoEquilibrio.margemContribuicaoPercentual)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-heading text-sm font-bold text-foreground">Fluxo de caixa</h2>
          <FluxoChart dados={fluxoParaGrafico} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-heading text-sm font-bold text-foreground">DRE em cascata</h2>
          <WaterfallDre linhas={dre} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgingBarras titulo="Vencido — a receber" dados={agingReceita} />
        <AgingBarras titulo="Vencido — a pagar" dados={agingDespesa} />
      </div>
    </div>
  );
}
