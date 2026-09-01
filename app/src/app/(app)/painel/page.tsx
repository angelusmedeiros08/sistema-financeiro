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
import { montarHrefLancamentosSemDimensao } from "@/lib/relatorios/drill-down";
import { limitesDoMes } from "@/lib/relatorios/regime";
import { emModoApresentacao } from "@/lib/apresentacao/sessao";
import { FocoApresentacao } from "@/components/apresentacao/foco-apresentacao";
import { hojeIsoBrasil } from "@/lib/data-brasil";

function tempoRelativo(dataIso: string): string {
  return formatDistanceToNowStrict(new Date(dataIso + "T00:00:00"), { addSuffix: true, locale: ptBR });
}

export default async function PaginaPainel({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const emApresentacao = emModoApresentacao(sp);
  const foco = sp.foco;

  const supabase = await createClient();
  const { inicio: mesInicio, fim: mesFim } = mesAtual();
  const [dados, indicadoresCAR, indicadoresCAP, serieCAR, serieCAP] = await Promise.all([
    obterDadosPainel(supabase, contexto.tenantId),
    buscarIndicadoresRealizacao(supabase, { tenantId: contexto.tenantId, tipo: "RECEITA", mesInicio, mesFim }),
    buscarIndicadoresRealizacao(supabase, { tenantId: contexto.tenantId, tipo: "DESPESA", mesInicio, mesFim }),
    buscarSerieIndicadoresRealizacao(supabase, { tenantId: contexto.tenantId, tipo: "RECEITA", meses: 6 }),
    buscarSerieIndicadoresRealizacao(supabase, { tenantId: contexto.tenantId, tipo: "DESPESA", meses: 6 }),
  ]);

  // hojeIso já é a data certa (fuso Brasília, ver lib/data-brasil.ts) — o
  // rótulo por extenso reaproveita o mesmo truque de formatarDataComAno
  // (parse e format sem timeZone explícito, os dois usando o fuso padrão do
  // processo): não passar timeZone aqui de novo evitaria deslocar de volta.
  const hojeIso = hojeIsoBrasil();
  const hoje = new Date(hojeIso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const nomeMes = new Date(mesInicio + "T00:00:00").toLocaleDateString("pt-BR", { month: "long" });
  const origemHref = "/painel";

  const hrefSaldoEmCaixa = montarHrefLancamentosSemDimensao({
    regime: "realizado",
    periodoInicio: "1900-01-01",
    periodoFim: hojeIso,
    rotulo: "Todo o histórico",
    origemHref,
  });
  const hrefRecebidoDoMes = montarHrefLancamentosSemDimensao({
    regime: "realizado",
    tipo: "RECEITA",
    periodoInicio: mesInicio,
    periodoFim: mesFim,
    rotulo: `Recebido em ${nomeMes}`,
    origemHref,
  });
  const hrefPagoDoMes = montarHrefLancamentosSemDimensao({
    regime: "realizado",
    tipo: "DESPESA",
    periodoInicio: mesInicio,
    periodoFim: mesFim,
    rotulo: `Pago em ${nomeMes}`,
    origemHref,
  });
  const hrefReceitasDoMes = montarHrefLancamentosSemDimensao({
    regime: "competencia",
    tipo: "RECEITA",
    periodoInicio: mesInicio,
    periodoFim: mesFim,
    rotulo: `Receitas de ${nomeMes}`,
    origemHref,
  });
  const hrefDespesasDoMes = montarHrefLancamentosSemDimensao({
    regime: "competencia",
    tipo: "DESPESA",
    periodoInicio: mesInicio,
    periodoFim: mesFim,
    rotulo: `Despesas de ${nomeMes}`,
    origemHref,
  });

  // Um par de hrefs (receitas/despesas) por ponto do FluxoChart — mesmo
  // mecanismo de montarHrefLancamentosSemDimensao já usado acima, só que
  // por mês do gráfico em vez de só o mês corrente. limitesDoMes inverte o
  // chaveIso ("YYYY-MM") de cada ponto pros limites do mês inteiro.
  const hrefsFluxo = dados.fluxo.map((p) => {
    const { inicio, fim } = limitesDoMes(p.chaveIso);
    const nomeMesPonto = new Date(inicio + "T00:00:00").toLocaleDateString("pt-BR", { month: "long" });
    return {
      receitas: montarHrefLancamentosSemDimensao({
        regime: "competencia",
        tipo: "RECEITA",
        periodoInicio: inicio,
        periodoFim: fim,
        rotulo: `Receitas de ${nomeMesPonto}`,
        origemHref,
      }),
      despesas: montarHrefLancamentosSemDimensao({
        regime: "competencia",
        tipo: "DESPESA",
        periodoInicio: inicio,
        periodoFim: fim,
        rotulo: `Despesas de ${nomeMesPonto}`,
        origemHref,
      }),
    };
  });

  // "Foco" — uma apresentação pode apontar pro Painel inteiro OU pra um
  // único cartão/gráfico dele, ampliado, sem o resto do dashboard em volta
  // (feedback do usuário: quer o gráfico em si, não a tela toda). Reusa
  // exatamente o mesmo dado já buscado acima — só muda o que é renderizado.
  if (emApresentacao && foco) {
    return (
      <FocoApresentacao estica={foco === "fluxo-caixa"}>
        {foco === "saldo-caixa" && (
          <div className="w-full">
            <StatCard variant="hero" label="Saldo em caixa" valor={formatarMoeda(dados.saldoEmCaixa)} serie={dados.saldoSerieSeisMeses} />
          </div>
        )}
        {foco === "resultado-mes" && (
          <div className="w-full">
            <StatCard
              variant={dados.resultadoDoMes.liquido >= 0 ? "teal" : "coral"}
              label="Resultado do mês"
              valor={formatarMoeda(dados.resultadoDoMes.liquido)}
              detalhe="Receitas menos despesas no mês corrente, por competência"
              delta={dados.resultadoDeltaPercentual}
              serie={dados.fluxo.map((f) => f.receitas - f.despesas)}
            >
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
                <span className="text-positivo">Receitas: {formatarMoeda(dados.resultadoDoMes.receitas)}</span>
                <span className="text-destructive">Despesas: {formatarMoeda(dados.resultadoDoMes.despesas)}</span>
              </div>
            </StatCard>
          </div>
        )}
        {foco === "fluxo-caixa" && (
          <div className="flex min-h-0 w-full flex-1 flex-col rounded-2xl bg-card p-8 shadow-card">
            <h2 className="mb-6 font-heading text-lg font-bold text-foreground">Fluxo de caixa (últimos 6 meses)</h2>
            <FluxoChart dados={dados.fluxo} hrefsPorMes={hrefsFluxo} apresentacao />
          </div>
        )}
        {foco === "indicadores-realizacao" && (
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
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
        )}
      </FocoApresentacao>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Painel financeiro</h1>
            <p className="text-sm capitalize text-muted-foreground">{hoje}</p>
          </div>
          {!emApresentacao && (
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
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <MotionCard index={0}>
              <StatCard
                variant="hero"
                label="Saldo em caixa"
                valor={formatarMoeda(dados.saldoEmCaixa)}
                serie={dados.saldoSerieSeisMeses}
                href={hrefSaldoEmCaixa}
              />
            </MotionCard>
          </div>
          <div className="lg:col-span-7">
            <MotionCard index={1}>
              <StatCard
                variant={dados.resultadoDoMes.liquido >= 0 ? "teal" : "coral"}
                label="Resultado do mês"
                valor={formatarMoeda(dados.resultadoDoMes.liquido)}
                detalhe="Receitas menos despesas no mês corrente, por competência"
                delta={dados.resultadoDeltaPercentual}
                serie={dados.fluxo.map((f) => f.receitas - f.despesas)}
              >
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
                  <Link href={hrefReceitasDoMes} className="text-positivo hover:underline">
                    Receitas: {formatarMoeda(dados.resultadoDoMes.receitas)}
                  </Link>
                  <Link href={hrefDespesasDoMes} className="text-destructive hover:underline">
                    Despesas: {formatarMoeda(dados.resultadoDoMes.despesas)}
                  </Link>
                </div>
              </StatCard>
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
              href="/contas-a-receber?situacao=vence30"
            />
          </MotionCard>
          <MotionCard index={3}>
            <StatCard variant="azul" icon={Coins} label="Recebido (mês)" valor={formatarMoeda(dados.recebidoDoMes)} href={hrefRecebidoDoMes} />
          </MotionCard>
          <MotionCard index={4}>
            <StatCard
              variant="ambar"
              icon={CreditCard}
              label="A pagar (30 dias)"
              valor={formatarMoeda(dados.aPagar.total)}
              detalhe={`Vencido: ${formatarMoeda(dados.vencidosPagar.vencidoTotal)}`}
              href="/contas-a-pagar?situacao=vence30"
            />
          </MotionCard>
          <MotionCard index={5}>
            <StatCard variant="roxo" icon={Wallet} label="Pago (mês)" valor={formatarMoeda(dados.pagoDoMes)} href={hrefPagoDoMes} />
          </MotionCard>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <IndicadorGauge
            rotulo="% Realizado de contas a receber"
            valor={indicadoresCAR.percentualRealizado}
            serie={serieCAR.map((p) => ({ mes: p.mes, valor: p.percentualRealizado }))}
            href="/contas-a-receber?situacao=todos"
          />
          <IndicadorGauge
            rotulo="% Realizado de contas a pagar"
            valor={indicadoresCAP.percentualRealizado}
            serie={serieCAP.map((p) => ({ mes: p.mes, valor: p.percentualRealizado }))}
            href="/contas-a-pagar?situacao=todos"
          />
          <IndicadorGauge
            rotulo="% Pago em atraso (a receber)"
            valor={indicadoresCAR.percentualPagoEmAtraso}
            invertido
            serie={serieCAR.map((p) => ({ mes: p.mes, valor: p.percentualPagoEmAtraso }))}
            href="/contas-a-receber?situacao=vencido"
          />
          <IndicadorGauge
            rotulo="% Pago em atraso (a pagar)"
            valor={indicadoresCAP.percentualPagoEmAtraso}
            invertido
            serie={serieCAP.map((p) => ({ mes: p.mes, valor: p.percentualPagoEmAtraso }))}
            href="/contas-a-pagar?situacao=vencido"
          />
        </div>

        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-4 font-heading text-sm font-bold text-foreground">Fluxo de caixa (últimos 6 meses)</h2>
          <FluxoChart dados={dados.fluxo} hrefsPorMes={hrefsFluxo} />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <PrimeirosPassosCard passos={dados.primeirosPassos} />

        <div className="rounded-2xl bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold text-foreground">Lançamentos recentes</h2>
            {!emApresentacao && (
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href="/despesas">Ver todas</Link>
              </Button>
            )}
          </div>

          {dados.eventosRecentes.length === 0 ? (
            <CtaImportarPlanilha />
          ) : (
            <ul className="flex flex-col">
              {dados.eventosRecentes.map((evento) => (
                <li key={evento.id} className="border-b border-border last:border-none">
                  <Link
                    href={evento.tipo === "RECEITA" ? `/receitas/${evento.id}` : `/despesas/${evento.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/40"
                  >
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
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
