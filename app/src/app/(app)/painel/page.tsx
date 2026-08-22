import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wallet, HandCoins, Coins, CreditCard } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { obterDadosPainel } from "./dados";
import { StatCard } from "@/components/painel/stat-card";
import { MotionCard } from "@/components/painel/motion-card";
import { FluxoChart } from "@/components/painel/fluxo-chart";
import { PrimeirosPassosCard } from "@/components/painel/primeiros-passos";
import { IndicadorGauge } from "@/components/relatorios/indicador-gauge";
import { CtaImportarPlanilha } from "@/components/lancamentos/cta-importar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarMoeda } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { ROTULO_STATUS_PARCELA, COR_STATUS_PARCELA } from "@/lib/status-parcela";
import { buscarIndicadoresRealizacao, buscarSerieIndicadoresRealizacao, mesAtual } from "@/lib/relatorios/indicadores-gauge";

function tempoRelativo(dataIso: string): string {
  return formatDistanceToNowStrict(new Date(dataIso + "T00:00:00"), { addSuffix: true, locale: ptBR });
}

export default async function PaginaPainel() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const { inicio: mesInicio, fim: mesFim } = mesAtual();
  const [dados, indicadoresCAR, indicadoresCAP, serieCAR, serieCAP] = await Promise.all([
    obterDadosPainel(supabase, contexto.tenantId),
    buscarIndicadoresRealizacao(supabase, { tenantId: contexto.tenantId, tipo: "RECEITA", mesInicio, mesFim }),
    buscarIndicadoresRealizacao(supabase, { tenantId: contexto.tenantId, tipo: "DESPESA", mesInicio, mesFim }),
    buscarSerieIndicadoresRealizacao(supabase, { tenantId: contexto.tenantId, tipo: "RECEITA", meses: 6 }),
    buscarSerieIndicadoresRealizacao(supabase, { tenantId: contexto.tenantId, tipo: "DESPESA", meses: 6 }),
  ]);

  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Painel financeiro</h1>
            <p className="text-sm capitalize text-muted-foreground">{hoje}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="rounded-full">
              <Link href="/despesas">Nova despesa</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href="/receitas">Nova receita</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href="/clientes/novo">Novo cliente</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href="/vendas/nova">Nova venda</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <MotionCard index={0}>
              <StatCard
                variant="hero"
                label="Saldo em caixa"
                valor={formatarMoeda(dados.saldoEmCaixa)}
                serie={dados.saldoSerieSeisMeses}
              />
            </MotionCard>
          </div>
          <div className="lg:col-span-7">
            <MotionCard index={1}>
              <StatCard
                variant={dados.resultadoDoMes >= 0 ? "teal" : "coral"}
                label="Resultado do mês"
                valor={formatarMoeda(dados.resultadoDoMes)}
                detalhe="Receitas menos despesas no mês corrente, por competência"
                delta={dados.resultadoDeltaPercentual}
                serie={dados.fluxo.map((f) => f.receitas - f.despesas)}
              />
            </MotionCard>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MotionCard index={2}>
            <StatCard
              variant="teal"
              icon={HandCoins}
              label="A receber (30 dias)"
              valor={formatarMoeda(dados.aReceber.total)}
              detalhe={`Vencido: ${formatarMoeda(dados.vencidosReceber.vencidoTotal)}`}
            />
          </MotionCard>
          <MotionCard index={3}>
            <StatCard variant="azul" icon={Coins} label="Recebido (mês)" valor={formatarMoeda(dados.recebidoDoMes)} />
          </MotionCard>
          <MotionCard index={4}>
            <StatCard
              variant="ambar"
              icon={CreditCard}
              label="A pagar (30 dias)"
              valor={formatarMoeda(dados.aPagar.total)}
              detalhe={`Vencido: ${formatarMoeda(dados.vencidosPagar.vencidoTotal)}`}
            />
          </MotionCard>
          <MotionCard index={5}>
            <StatCard variant="roxo" icon={Wallet} label="Pago (mês)" valor={formatarMoeda(dados.pagoDoMes)} />
          </MotionCard>
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

        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-4 font-heading text-sm font-bold text-foreground">Fluxo de caixa (últimos 6 meses)</h2>
          <FluxoChart dados={dados.fluxo} />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <PrimeirosPassosCard passos={dados.primeirosPassos} />

        <div className="rounded-2xl bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold text-foreground">Lançamentos recentes</h2>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link href="/despesas">Ver todas</Link>
            </Button>
          </div>

          {dados.eventosRecentes.length === 0 ? (
            <CtaImportarPlanilha />
          ) : (
            <ul className="flex flex-col">
              {dados.eventosRecentes.map((evento) => (
                <li key={evento.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-none">
                  <span
                    className={
                      "flex size-8 shrink-0 items-center justify-center rounded-lg " +
                      (evento.tipo === "RECEITA" ? "bg-positivo" : "bg-destructive")
                    }
                  >
                    {evento.tipo === "RECEITA" ? (
                      <HandCoins size={15} weight="bold" className="text-white" />
                    ) : (
                      <Wallet size={15} weight="bold" className="text-white" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{evento.descricao ?? "Sem descrição"}</p>
                    <p className="text-xs text-muted-foreground">
                      {evento.tipo === "RECEITA" ? "Receita" : "Despesa"} · {tempoRelativo(evento.dataCompetencia)}
                    </p>
                  </div>
                  {evento.status && (
                    <Badge className={cn("border-none font-semibold", COR_STATUS_PARCELA[evento.status])}>
                      {ROTULO_STATUS_PARCELA[evento.status] ?? evento.status}
                    </Badge>
                  )}
                  <span className="text-right text-sm font-semibold tabular-nums text-foreground">
                    {formatarMoeda(evento.valor_total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
