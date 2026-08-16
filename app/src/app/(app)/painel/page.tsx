import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, HandCoins } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { obterDadosPainel } from "./dados";
import { StatCard } from "@/components/painel/stat-card";
import { FluxoChart } from "@/components/painel/fluxo-chart";
import { IndicadorGauge } from "@/components/relatorios/indicador-gauge";
import { CtaImportarPlanilha } from "@/components/lancamentos/cta-importar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarMoeda } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { ROTULO_STATUS_PARCELA, COR_STATUS_PARCELA } from "@/lib/status-parcela";
import { buscarIndicadoresRealizacao, mesAtual } from "@/lib/relatorios/indicadores-gauge";

export default async function PaginaPainel() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const { inicio: mesInicio, fim: mesFim } = mesAtual();
  const [dados, indicadoresCAR, indicadoresCAP] = await Promise.all([
    obterDadosPainel(supabase, contexto.tenantId),
    buscarIndicadoresRealizacao(supabase, { tenantId: contexto.tenantId, tipo: "RECEITA", mesInicio, mesFim }),
    buscarIndicadoresRealizacao(supabase, { tenantId: contexto.tenantId, tipo: "DESPESA", mesInicio, mesFim }),
  ]);

  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Painel financeiro</h1>
        <p className="text-sm capitalize text-muted-foreground">{hoje}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          variant="hero"
          label="Saldo em caixa"
          valor={formatarMoeda(dados.saldoEmCaixa)}
        />
        <StatCard
          variant="teal"
          label="A receber (30 dias)"
          valor={formatarMoeda(dados.aReceber.total)}
          detalhe={`Vencido: ${formatarMoeda(dados.vencidosReceber.vencidoTotal)} · Vence hoje: ${formatarMoeda(dados.vencidosReceber.venceHojeTotal)}`}
        />
        <StatCard
          variant="teal"
          label="Recebido (mês)"
          valor={formatarMoeda(dados.recebidoDoMes)}
        />
        <StatCard
          variant="ambar"
          label="A pagar (30 dias)"
          valor={formatarMoeda(dados.aPagar.total)}
          detalhe={`Vencido: ${formatarMoeda(dados.vencidosPagar.vencidoTotal)} · Vence hoje: ${formatarMoeda(dados.vencidosPagar.venceHojeTotal)}`}
        />
        <StatCard
          variant="violeta"
          label="Pago (mês)"
          valor={formatarMoeda(dados.pagoDoMes)}
        />
        <StatCard
          variant="coral"
          label="Resultado do mês"
          valor={formatarMoeda(dados.resultadoDoMes)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <IndicadorGauge rotulo="% Realizado de contas a receber" valor={indicadoresCAR.percentualRealizado} />
        <IndicadorGauge rotulo="% Realizado de contas a pagar" valor={indicadoresCAP.percentualRealizado} />
        <IndicadorGauge rotulo="% Pago em atraso (a receber)" valor={indicadoresCAR.percentualPagoEmAtraso} invertido />
        <IndicadorGauge rotulo="% Pago em atraso (a pagar)" valor={indicadoresCAP.percentualPagoEmAtraso} invertido />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-heading text-sm font-bold text-foreground">
            Fluxo de caixa (últimos 6 meses)
          </h2>
          <FluxoChart dados={dados.fluxo} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
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
                <li
                  key={evento.id}
                  className="flex items-center gap-3 border-b border-border py-2.5 last:border-none"
                >
                  <span
                    className={
                      "flex size-8 shrink-0 items-center justify-center rounded-lg " +
                      (evento.tipo === "RECEITA" ? "bg-[#157F6B]" : "bg-[#D8583A]")
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
                    <p className="text-xs text-muted-foreground">{evento.tipo === "RECEITA" ? "Receita" : "Despesa"}</p>
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
