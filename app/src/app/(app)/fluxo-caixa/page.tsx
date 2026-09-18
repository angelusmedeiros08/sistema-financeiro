import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarFluxoCaixaGrade, buscarPrevistoRealizado, type PontoFluxoCaixa, type PontoPrevistoRealizado } from "@/lib/relatorios/fluxo-caixa";
import { buscarSaldoAntesDe } from "@/lib/relatorios/saldo-projetado";
import { limitesGranularidade, type Granularidade, type Regime } from "@/lib/relatorios/regime";
import { montarHrefLancamentosSemDimensao } from "@/lib/relatorios/drill-down";
import { RelatoriosControles } from "../relatorios/controles";
import { ComparativoBarras } from "@/components/relatorios/comparativo-barras";
import { FluxoDiarioTabela, FluxoPrevistoRealizadoTabela } from "@/components/relatorios/fluxo-caixa-tabelas";
import { cn } from "@/lib/utils";
import { TituloPagina } from "@/components/layout/titulo-pagina";

const ABAS = [
  { valor: "diario", rotulo: "Diário" },
  { valor: "previsto_realizado", rotulo: "Previsto × Realizado" },
] as const;

export default async function PaginaFluxoCaixa({
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
    return `/fluxo-caixa?${p.toString()}`;
  }

  // "Voltar" de /lancamentos precisa cair na mesma combinação de
  // regime/granularidade/período que a pessoa tinha na tela, não em
  // /fluxo-caixa "limpo" — por isso preserva `sp` inteiro, igual hrefAba.
  const origemHref = `/fluxo-caixa?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]).toString()}`;

  return (
    <div className="flex w-full flex-col gap-6">
      <TituloPagina>Fluxo de caixa</TituloPagina>
      <RelatoriosControles {...params} />

      <div className="flex gap-1">
        {ABAS.map((a) => (
          <Link
            key={a.valor}
            href={hrefAba(a.valor)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium",
              aba === a.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {a.rotulo}
          </Link>
        ))}
      </div>

      {aba === "diario" ? (
        <FluxoDiario tenantId={contexto.tenantId} params={params} supabase={supabase} origemHref={origemHref} />
      ) : (
        <FluxoPrevistoRealizado tenantId={contexto.tenantId} params={params} supabase={supabase} origemHref={origemHref} />
      )}
    </div>
  );
}

// Um href por ponto (gráfico, por série) + um por linha (tabela, sem
// filtro de tipo) — mesmo mecanismo de drill-down do Painel
// (montarHrefLancamentosSemDimensao), só que aqui a granularidade não é
// fixa em mês, vem do seletor da própria tela (achado em releitura: nada
// no Fluxo de caixa era clicável, diferente do resto do sistema).
function montarHrefsFluxoDiario(pontos: PontoFluxoCaixa[], regime: Regime, granularidade: Granularidade, origemHref: string) {
  const grafico: Record<string, Partial<Record<string, string>>> = {};
  const tabela: Record<string, string> = {};
  for (const p of pontos) {
    const limites = limitesGranularidade(p.chave, granularidade);
    grafico[p.chave] = {
      entradas: montarHrefLancamentosSemDimensao({ regime, tipo: "RECEITA", periodoInicio: limites.inicio, periodoFim: limites.fim, rotulo: `Entradas em ${p.chave}`, origemHref }),
      saidas: montarHrefLancamentosSemDimensao({ regime, tipo: "DESPESA", periodoInicio: limites.inicio, periodoFim: limites.fim, rotulo: `Saídas em ${p.chave}`, origemHref }),
    };
    tabela[p.chave] = montarHrefLancamentosSemDimensao({ regime, periodoInicio: limites.inicio, periodoFim: limites.fim, rotulo: `Movimento em ${p.chave}`, origemHref });
  }
  return { grafico, tabela };
}

async function FluxoDiario({
  tenantId,
  params,
  supabase,
  origemHref,
}: {
  tenantId: string;
  params: ReturnType<typeof lerParametrosRelatorio>;
  supabase: Awaited<ReturnType<typeof createClient>>;
  origemHref: string;
}) {
  // "Saldo acumulado" só é saldo bancário de verdade em regime realizado —
  // nos outros dois (competência/previsto) não existe "saldo antes do
  // período" com esse mesmo sentido, então o acumulado continua partindo
  // de zero (resultado do período, não saldo de caixa).
  const saldoInicial = params.regime === "realizado" ? await buscarSaldoAntesDe(supabase, tenantId, params.dataInicio) : undefined;
  const pontos = await buscarFluxoCaixaGrade(supabase, { tenantId, ...params, saldoInicial });
  const hrefs = montarHrefsFluxoDiario(pontos, params.regime, params.granularidade, origemHref);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-card shadow-card p-5">
        <h2 className="mb-4 font-heading text-sm font-bold text-foreground">Entradas × Saídas</h2>
        <ComparativoBarras
          dados={pontos.map((p) => ({ chave: p.chave, entradas: p.entradas, saidas: -p.saidas }))}
          eixoX="chave"
          series={[
            { chave: "entradas", nome: "Entradas", cor: "var(--positivo)" },
            { chave: "saidas", nome: "Saídas", cor: "var(--destructive)" },
          ]}
          hrefsPorChave={hrefs.grafico}
        />
      </div>

      <FluxoDiarioTabela pontos={pontos} hrefsPorChave={hrefs.tabela} />
    </div>
  );
}

// "Previsto"/"realizado" aqui são REGIMES diferentes (não tipo RECEITA ×
// DESPESA como em montarHrefsFluxoDiario) — buscarPrevistoRealizado já soma
// os dois tipos juntos por período (ver comentário na função), então o
// drill-down também vai sem filtro de tipo.
function montarHrefsFluxoPrevistoRealizado(pontos: PontoPrevistoRealizado[], granularidade: Granularidade, origemHref: string) {
  const grafico: Record<string, Partial<Record<string, string>>> = {};
  const tabela: Record<string, string> = {};
  for (const p of pontos) {
    const limites = limitesGranularidade(p.chave, granularidade);
    const previsto = montarHrefLancamentosSemDimensao({ regime: "previsto", periodoInicio: limites.inicio, periodoFim: limites.fim, rotulo: `Previsto em ${p.chave}`, origemHref });
    const realizado = montarHrefLancamentosSemDimensao({ regime: "realizado", periodoInicio: limites.inicio, periodoFim: limites.fim, rotulo: `Realizado em ${p.chave}`, origemHref });
    grafico[p.chave] = { previsto, realizado };
    tabela[p.chave] = realizado;
  }
  return { grafico, tabela };
}

async function FluxoPrevistoRealizado({
  tenantId,
  params,
  supabase,
  origemHref,
}: {
  tenantId: string;
  params: ReturnType<typeof lerParametrosRelatorio>;
  supabase: Awaited<ReturnType<typeof createClient>>;
  origemHref: string;
}) {
  const pontos = await buscarPrevistoRealizado(supabase, {
    tenantId,
    granularidade: params.granularidade,
    dataInicio: params.dataInicio,
    dataFim: params.dataFim,
  });
  const hrefs = montarHrefsFluxoPrevistoRealizado(pontos, params.granularidade, origemHref);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-card shadow-card p-5">
        <h2 className="mb-4 font-heading text-sm font-bold text-foreground">Vencimento previsto × Pagamento realizado</h2>
        <ComparativoBarras
          dados={pontos}
          eixoX="chave"
          series={[
            { chave: "previsto", nome: "Previsto", cor: "#E3A62F" },
            { chave: "realizado", nome: "Realizado", cor: "var(--positivo)" },
          ]}
          hrefsPorChave={hrefs.grafico}
        />
      </div>

      <FluxoPrevistoRealizadoTabela pontos={pontos} hrefsPorChave={hrefs.tabela} />
    </div>
  );
}
