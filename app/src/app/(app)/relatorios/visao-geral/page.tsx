import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarDRE } from "@/lib/relatorios/dre";
import { buscarFluxoCaixaGrade } from "@/lib/relatorios/fluxo-caixa";
import { buscarPontoEquilibrio } from "@/lib/relatorios/ponto-equilibrio";
import { buscarAging, buscarResumoVencimentos } from "@/lib/relatorios/aging";
import { buscarIndicadoresRealizacao, buscarSerieIndicadoresRealizacao, mesAtual } from "@/lib/relatorios/indicadores-gauge";
import { buscarAnaliseCategorias } from "@/lib/relatorios/analise-despesas";
import { buscarConcentracaoReceita } from "@/lib/relatorios/concentracao-receita";
import { buscarSaldoProjetado } from "@/lib/relatorios/saldo-projetado";
import { RelatoriosSubNav } from "../sub-nav";
import { RelatoriosControles } from "../controles";
import { StatCard } from "@/components/painel/stat-card";
import { FluxoChart } from "@/components/painel/fluxo-chart";
import { WaterfallDre } from "@/components/relatorios/waterfall-dre";
import { AgingBarras } from "@/components/relatorios/aging-barras";
import { IndicadorGauge } from "@/components/relatorios/indicador-gauge";
import { TopCategoriasDonut } from "@/components/relatorios/top-categorias-donut";
import { BadgeRiscoConcentracao } from "@/components/relatorios/badge-risco-concentracao";
import { BadgeRupturaSaldo } from "@/components/relatorios/badge-ruptura-saldo";
import { formatarMoeda, formatarPercentual } from "@/lib/formatacao";

export default async function PaginaRelatoriosVisaoGeral({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");
  const { tenantId } = contexto;

  const spBrutos = await searchParams;
  const params = lerParametrosRelatorio(spBrutos);
  const supabase = await createClient();

  const { inicio: mesInicio, fim: mesFim } = mesAtual();

  // Preserva regime/período/granularidade selecionados na URL — quem clica
  // numa fatia e depois em "Voltar pro relatório" cai na mesma visão que
  // estava vendo, não num /relatorios/visao-geral genérico sem filtro.
  const qsAtual = new URLSearchParams(Object.entries(spBrutos).filter((par): par is [string, string] => par[1] !== undefined)).toString();
  const origemHref = `/relatorios/visao-geral${qsAtual ? `?${qsAtual}` : ""}`;

  const [dre, fluxo, pontoEquilibrio, agingReceita, agingDespesa, resumoReceber, resumoPagar, indicadoresCAR, indicadoresCAP, serieCAR, serieCAP, topReceitas, topDespesas, concentracao, saldoProjetado] =
    await Promise.all([
      buscarDRE(supabase, { tenantId, ...params }),
      buscarFluxoCaixaGrade(supabase, { tenantId, ...params }),
      buscarPontoEquilibrio(supabase, { tenantId, ...params }),
      buscarAging(supabase, { tenantId, tipo: "RECEITA" }),
      buscarAging(supabase, { tenantId, tipo: "DESPESA" }),
      buscarResumoVencimentos(supabase, { tenantId, tipo: "RECEITA" }),
      buscarResumoVencimentos(supabase, { tenantId, tipo: "DESPESA" }),
      buscarIndicadoresRealizacao(supabase, { tenantId, tipo: "RECEITA", mesInicio, mesFim }),
      buscarIndicadoresRealizacao(supabase, { tenantId, tipo: "DESPESA", mesInicio, mesFim }),
      buscarSerieIndicadoresRealizacao(supabase, { tenantId, tipo: "RECEITA", meses: 6 }),
      buscarSerieIndicadoresRealizacao(supabase, { tenantId, tipo: "DESPESA", meses: 6 }),
      buscarAnaliseCategorias(supabase, { tenantId, ...params, tipo: "RECEITA", origemHref }),
      buscarAnaliseCategorias(supabase, { tenantId, ...params, tipo: "DESPESA", origemHref }),
      buscarConcentracaoReceita(supabase, { tenantId, origemHref }),
      buscarSaldoProjetado(supabase, tenantId),
    ]);

  const projecaoD7 = saldoProjetado.projecoes.find((p) => p.dias === 7);

  const resultado = dre.at(-1)?.valorAcumulado ?? 0;
  const fluxoParaGrafico = fluxo.map((p) => ({ mes: p.chave, receitas: p.entradas, despesas: p.saidas }));

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
      </div>

      <RelatoriosSubNav />
      <RelatoriosControles {...params} />

      {(concentracao.nivelRisco !== "BAIXO" || projecaoD7?.ruptura) && (
        <div className="flex flex-wrap gap-2">
          {projecaoD7?.ruptura && <BadgeRupturaSaldo saldoD7={projecaoD7.saldo} />}
          {concentracao.nivelRisco !== "BAIXO" && <BadgeRiscoConcentracao nivelRisco={concentracao.nivelRisco} percentualTop3={concentracao.percentualTop3} />}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          variant="hero"
          label="Resultado do período"
          valor={formatarMoeda(resultado)}
          href="/relatorios/dre"
        />
        <StatCard
          variant="coral"
          label="A receber vencido"
          valor={formatarMoeda(resumoReceber.vencidoTotal)}
          detalhe={`Vence hoje: ${formatarMoeda(resumoReceber.venceHojeTotal)}`}
          href="/contas-a-receber?situacao=vencido"
        />
        <StatCard
          variant="ambar"
          label="A pagar vencido"
          valor={formatarMoeda(resumoPagar.vencidoTotal)}
          detalhe={`Vence hoje: ${formatarMoeda(resumoPagar.venceHojeTotal)}`}
          href="/contas-a-pagar?situacao=vencido"
        />
        <StatCard
          variant="teal"
          label="Ponto de equilíbrio"
          valor={formatarMoeda(pontoEquilibrio.pontoEquilibrio)}
          detalhe={`Margem de contribuição: ${formatarPercentual(pontoEquilibrio.margemContribuicaoPercentual)}`}
          href="/relatorios/ponto-equilibrio"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <IndicadorGauge
          rotulo="% Realizado de contas a receber"
          valor={indicadoresCAR.percentualRealizado}
          serie={serieCAR.map((p) => ({ mes: p.mes, valor: p.percentualRealizado }))}
        />
        <IndicadorGauge
          rotulo="% Realizado de contas a pagar"
          valor={indicadoresCAP.percentualRealizado}
          serie={serieCAP.map((p) => ({ mes: p.mes, valor: p.percentualRealizado }))}
        />
        <IndicadorGauge
          rotulo="% Pago em atraso (a receber)"
          valor={indicadoresCAR.percentualPagoEmAtraso}
          invertido
          serie={serieCAR.map((p) => ({ mes: p.mes, valor: p.percentualPagoEmAtraso }))}
        />
        <IndicadorGauge
          rotulo="% Pago em atraso (a pagar)"
          valor={indicadoresCAP.percentualPagoEmAtraso}
          invertido
          serie={serieCAP.map((p) => ({ mes: p.mes, valor: p.percentualPagoEmAtraso }))}
        />
      </div>

      {/* Cada gráfico na sua própria linha, largura cheia — dividir a tela
          em 2 colunas espremia a cascata (23 linhas reais) até virar
          ilegível, mesmo motivo já corrigido no DRE dedicado. */}
      <div className="rounded-2xl bg-card shadow-card p-5">
        <h2 className="mb-4 font-heading text-sm font-bold text-foreground">Fluxo de caixa</h2>
        <FluxoChart dados={fluxoParaGrafico} />
      </div>

      <div className="rounded-2xl bg-card shadow-card p-5">
        <h2 className="mb-4 font-heading text-sm font-bold text-foreground">DRE em cascata</h2>
        <WaterfallDre linhas={dre} altura={360} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopCategoriasDonut
          titulo="Top receitas"
          linhas={topReceitas}
          dimensao="categoria"
          periodoInicio={params.dataInicio}
          periodoFim={params.dataFim}
          origemHref={origemHref}
        />
        <TopCategoriasDonut
          titulo="Top despesas"
          linhas={topDespesas}
          dimensao="categoria"
          periodoInicio={params.dataInicio}
          periodoFim={params.dataFim}
          origemHref={origemHref}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgingBarras titulo="Vencido: a receber" dados={agingReceita} />
        <AgingBarras titulo="Vencido: a pagar" dados={agingDespesa} />
      </div>
    </div>
  );
}
