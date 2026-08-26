import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, HandCoins } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { obterDadosPainel } from "@/app/(app)/painel/dados";
import { StatCard } from "@/components/painel/stat-card";
import { FluxoChart } from "@/components/painel/fluxo-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarMoeda } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { ROTULO_STATUS_PARCELA, COR_STATUS_PARCELA } from "@/lib/status-parcela";

// Mesmíssima leitura de dados do painel interno (obterDadosPainel é pura
// apresentação, sem nenhuma ação de escrita) — só o shell ao redor muda.
export default async function PaginaPortal() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const dados = await obterDadosPainel(supabase, contexto.tenantId, contexto.pessoaId ?? undefined);

  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Painel financeiro</h1>
        <p className="text-sm capitalize text-muted-foreground">{hoje}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard variant="hero" label="Saldo em caixa" valor={formatarMoeda(dados.saldoEmCaixa)} />
        <StatCard
          variant="teal"
          label="A receber (30 dias)"
          valor={formatarMoeda(dados.aReceber.total)}
          detalhe={`Vencido: ${formatarMoeda(dados.vencidosReceber.vencidoTotal)} · Vence hoje: ${formatarMoeda(dados.vencidosReceber.venceHojeTotal)}`}
        />
        <StatCard variant="teal" label="Recebido (mês)" valor={formatarMoeda(dados.recebidoDoMes)} />
        <StatCard
          variant="ambar"
          label="A pagar (30 dias)"
          valor={formatarMoeda(dados.aPagar.total)}
          detalhe={`Vencido: ${formatarMoeda(dados.vencidosPagar.vencidoTotal)} · Vence hoje: ${formatarMoeda(dados.vencidosPagar.venceHojeTotal)}`}
        />
        <StatCard variant="sage" label="Pago (mês)" valor={formatarMoeda(dados.pagoDoMes)} />
        <StatCard variant="coral" label="Resultado do mês" valor={formatarMoeda(dados.resultadoDoMes.liquido)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl bg-card shadow-card p-5">
          <h2 className="mb-4 font-heading text-sm font-bold text-foreground">Fluxo de caixa (últimos 6 meses)</h2>
          <FluxoChart dados={dados.fluxo} />
        </div>

        <div className="rounded-2xl bg-card shadow-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold text-foreground">Lançamentos recentes</h2>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link href="/portal/lancamentos">Ver todos</Link>
            </Button>
          </div>

          {dados.eventosRecentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento ainda.</p>
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
