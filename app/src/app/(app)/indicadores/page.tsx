import { redirect } from "next/navigation";
import { ArrowUp, ArrowDown } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarConcentracaoReceita } from "@/lib/relatorios/concentracao-receita";
import { buscarVariacaoCategorias } from "@/lib/relatorios/variacao-categorias";
import { buscarPMR, buscarPMP } from "@/lib/relatorios/prazos-medios";
import { buscarAging } from "@/lib/relatorios/aging";
import { buscarDistribuicaoFormaPagamento } from "@/lib/relatorios/distribuicao-forma-pagamento";
import { TopCategoriasDonut } from "@/components/relatorios/top-categorias-donut";
import { AgingBarras } from "@/components/relatorios/aging-barras";
import { BadgeRiscoConcentracao } from "@/components/relatorios/badge-risco-concentracao";
import { formatarMoeda, formatarPercentual } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

export default async function PaginaIndicadores() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");
  const { tenantId } = contexto;

  const supabase = await createClient();

  const [concentracao, variacaoReceitas, variacaoDespesas, pmr, pmp, agingReceber, agingPagar, distribuicaoFormaPagamento] = await Promise.all([
    buscarConcentracaoReceita(supabase, { tenantId }),
    buscarVariacaoCategorias(supabase, { tenantId, tipo: "RECEITA" }),
    buscarVariacaoCategorias(supabase, { tenantId, tipo: "DESPESA" }),
    buscarPMR(supabase, { tenantId }),
    buscarPMP(supabase, { tenantId }),
    buscarAging(supabase, { tenantId, tipo: "RECEITA" }),
    buscarAging(supabase, { tenantId, tipo: "DESPESA" }),
    buscarDistribuicaoFormaPagamento(supabase, { tenantId }),
  ]);

  const donutClientes = concentracao.topClientes.map((c, i) => ({
    categoriaId: c.pessoaId ?? `sem-pessoa-${i}`,
    categoriaNome: c.nome,
    ehCustoFixo: false,
    total: c.valor,
    percentualDoTotal: c.percentual,
    percentualAcumulado: 0,
  }));

  const donutFormaPagamento = distribuicaoFormaPagamento.map((f, i) => ({
    categoriaId: f.formaPagamentoId ?? `nao-informado-${i}`,
    categoriaNome: f.nome,
    ehCustoFixo: false,
    total: f.valorTotal,
    percentualDoTotal: f.percentualDoTotal,
    percentualAcumulado: 0,
  }));

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Indicadores</h1>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-base font-bold text-foreground">Meu risco está concentrado?</h2>
          <BadgeRiscoConcentracao nivelRisco={concentracao.nivelRisco} percentualTop3={concentracao.percentualTop3} />
        </div>
        <TopCategoriasDonut titulo="Top clientes por receita (últimos 12 meses)" linhas={donutClientes} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-heading text-base font-bold text-foreground">Onde meu dinheiro está indo?</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ListaVariacaoCategorias titulo="Receitas — maior variação vs. mês anterior" linhas={variacaoReceitas} />
          <ListaVariacaoCategorias titulo="Despesas — maior variação vs. mês anterior" linhas={variacaoDespesas} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-heading text-base font-bold text-foreground">Quem não paga em dia, e pra quem eu devo?</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CardPrazoMedio titulo="Prazo médio de recebimento (PMR)" dias={pmr.dias} quantidadeBaixas={pmr.quantidadeBaixas} />
          <CardPrazoMedio titulo="Prazo médio de pagamento (PMP)" dias={pmp.dias} quantidadeBaixas={pmp.quantidadeBaixas} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AgingBarras titulo="Aging — contas a receber" dados={agingReceber} />
          <AgingBarras titulo="Aging — contas a pagar" dados={agingPagar} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-heading text-base font-bold text-foreground">Como me pagam?</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TopCategoriasDonut titulo="Distribuição por forma de pagamento (últimos 6 meses)" linhas={donutFormaPagamento} />
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-4 font-heading text-sm font-bold text-foreground">Atraso médio por forma</h3>
            {distribuicaoFormaPagamento.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma baixa no período.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {distribuicaoFormaPagamento.map((f) => (
                  <li key={f.formaPagamentoId ?? "nao-informado"} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex-1 truncate text-foreground">{f.nome}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{formatarMoeda(f.valorTotal)}</span>
                    <span className={cn("w-20 shrink-0 text-right text-xs font-semibold tabular-nums", f.atrasoMedioDias > 0 ? "text-[#D8583A]" : "text-[#157F6B]")}>
                      {f.atrasoMedioDias >= 0 ? "+" : ""}
                      {f.atrasoMedioDias.toFixed(1)}d
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function CardPrazoMedio({ titulo, dias, quantidadeBaixas }: { titulo: string; dias: number; quantidadeBaixas: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{titulo}</p>
      <p className={cn("text-2xl font-bold tabular-nums", dias > 0 ? "text-[#D8583A]" : "text-[#157F6B]")}>
        {dias >= 0 ? "+" : ""}
        {dias.toFixed(1)} dias
      </p>
      <p className="text-xs text-muted-foreground">{quantidadeBaixas} baixa(s) nos últimos 6 meses</p>
    </div>
  );
}

function ListaVariacaoCategorias({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: { categoriaId: string; nome: string; valorMesAtual: number; valorMesAnterior: number; variacaoPercentual: number }[];
}) {
  const principais = linhas.slice(0, 6);
  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{titulo}</h3>
      {principais.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem movimentação suficiente pra comparar.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {principais.map((l) => {
            const positivo = l.variacaoPercentual >= 0;
            return (
              <li key={l.categoriaId} className="flex items-center gap-3 text-sm">
                <span className="flex-1 truncate text-foreground">{l.nome}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{formatarMoeda(l.valorMesAtual)}</span>
                <span className={cn("flex shrink-0 items-center gap-0.5 text-xs font-semibold tabular-nums", positivo ? "text-[#157F6B]" : "text-[#D8583A]")}>
                  {positivo ? <ArrowUp size={11} weight="bold" /> : <ArrowDown size={11} weight="bold" />}
                  {formatarPercentual(Math.abs(l.variacaoPercentual))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
