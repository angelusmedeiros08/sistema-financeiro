import { redirect } from "next/navigation";
import { ArrowUp, ArrowDown } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarConcentracaoReceita } from "@/lib/relatorios/concentracao-receita";
import { buscarVariacaoCategorias } from "@/lib/relatorios/variacao-categorias";
import { buscarPMR, buscarPMP } from "@/lib/relatorios/prazos-medios";
import { buscarAging } from "@/lib/relatorios/aging";
import { buscarDistribuicaoFormaPagamento } from "@/lib/relatorios/distribuicao-forma-pagamento";
import { buscarSaldoProjetado, buscarSerieSaldoProjetado, type SaldoProjetado, type PontoSerieSaldo } from "@/lib/relatorios/saldo-projetado";
import { SaldoProjetadoChart } from "@/components/relatorios/saldo-projetado-chart";
import { TopCategoriasDonut } from "@/components/relatorios/top-categorias-donut";
import { AgingBarras } from "@/components/relatorios/aging-barras";
import { BadgeRiscoConcentracao } from "@/components/relatorios/badge-risco-concentracao";
import { BadgeRupturaSaldo } from "@/components/relatorios/badge-ruptura-saldo";
import { formatarMoeda, formatarPercentual } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

export default async function PaginaIndicadores() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");
  const { tenantId } = contexto;

  const supabase = await createClient();

  const [saldoProjetado, serieSaldo, concentracao, variacaoReceitas, variacaoDespesas, pmr, pmp, agingReceber, agingPagar, distribuicaoFormaPagamento] = await Promise.all([
    buscarSaldoProjetado(supabase, tenantId),
    buscarSerieSaldoProjetado(supabase, tenantId),
    buscarConcentracaoReceita(supabase, { tenantId }),
    buscarVariacaoCategorias(supabase, { tenantId, tipo: "RECEITA" }),
    buscarVariacaoCategorias(supabase, { tenantId, tipo: "DESPESA" }),
    buscarPMR(supabase, { tenantId }),
    buscarPMP(supabase, { tenantId }),
    buscarAging(supabase, { tenantId, tipo: "RECEITA" }),
    buscarAging(supabase, { tenantId, tipo: "DESPESA" }),
    buscarDistribuicaoFormaPagamento(supabase, { tenantId }),
  ]);

  const projecaoD7 = saldoProjetado.projecoes.find((p) => p.dias === 7);

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

      <section className="rounded-2xl bg-card shadow-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-base font-bold text-foreground">Estou ficando sem caixa?</h2>
          {projecaoD7?.ruptura && <BadgeRupturaSaldo saldoD7={projecaoD7.saldo} />}
        </div>
        <CardSaldoProjetado {...saldoProjetado} pontos={serieSaldo.pontos} />
      </section>

      <section className="rounded-2xl bg-card shadow-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-base font-bold text-foreground">Meu risco está concentrado?</h2>
          <BadgeRiscoConcentracao nivelRisco={concentracao.nivelRisco} percentualTop3={concentracao.percentualTop3} />
        </div>
        <TopCategoriasDonut titulo="Top clientes por receita (últimos 12 meses)" linhas={donutClientes} />
      </section>

      <section className="rounded-2xl bg-card shadow-card p-6">
        <h2 className="mb-4 font-heading text-base font-bold text-foreground">Onde meu dinheiro está indo?</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ListaVariacaoCategorias titulo="Receitas — maior variação vs. mês anterior" linhas={variacaoReceitas} />
          <ListaVariacaoCategorias titulo="Despesas — maior variação vs. mês anterior" linhas={variacaoDespesas} />
        </div>
      </section>

      <section className="rounded-2xl bg-card shadow-card p-6">
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

      <section className="rounded-2xl bg-card shadow-card p-6">
        <h2 className="mb-4 font-heading text-base font-bold text-foreground">Como me pagam?</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TopCategoriasDonut titulo="Distribuição por forma de pagamento (últimos 6 meses)" linhas={donutFormaPagamento} />
          <div className="rounded-2xl bg-card shadow-card p-5">
            <h3 className="mb-4 font-heading text-sm font-bold text-foreground">Atraso médio por forma</h3>
            {distribuicaoFormaPagamento.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma baixa no período.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {distribuicaoFormaPagamento.map((f) => (
                  <li key={f.formaPagamentoId ?? "nao-informado"} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex-1 truncate text-foreground">{f.nome}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{formatarMoeda(f.valorTotal)}</span>
                    <span className={cn("min-w-20 shrink-0 text-right text-xs font-semibold tabular-nums", f.atrasoMedioDias > 0 ? "text-destructive" : "text-positivo")}>
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

function CardSaldoProjetado({ saldoAtual, projecoes, limiar, pontos }: SaldoProjetado & { pontos: PontoSerieSaldo[] }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Saldo atual</h3>
        <span className="text-lg font-bold tabular-nums text-foreground">{formatarMoeda(saldoAtual)}</span>
      </div>
      <div className="mb-2 flex items-center gap-4 text-[11px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-[2px] w-4 rounded-full bg-positivo" /> Realizado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[2px] w-4 rounded-full bg-[#4C7DF0]" style={{ backgroundImage: "repeating-linear-gradient(90deg,#4C7DF0 0 4px,transparent 4px 7px)" }} /> Projetado
        </span>
      </div>
      <SaldoProjetadoChart pontos={pontos} limiar={limiar} />
      {/* grid-cols-3 fixo (sem responsivo) deixava "-R$ 19.940.003.522.480,50"
          (tabular-nums, text-lg) sem espaço nenhum em 375px — texto de
          célula vizinha se sobrepunha ao invés de quebrar linha, já que
          grid não trunca/quebra sozinho. Empilha em 1 coluna até sm. */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {projecoes.map((p) => (
          <div key={p.dias} className={cn("rounded-xl p-3", p.ruptura ? "bg-destructive/8" : "bg-muted/40")}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">D+{p.dias}</p>
            <p className={cn("mt-1 text-lg font-bold tabular-nums", p.ruptura ? "text-destructive" : "text-foreground")}>{formatarMoeda(p.saldo)}</p>
          </div>
        ))}
      </div>
      {limiar > 0 && <p className="mt-3 text-xs text-muted-foreground">Colchão mínimo configurado: {formatarMoeda(limiar)}</p>}
    </div>
  );
}

function CardPrazoMedio({ titulo, dias, quantidadeBaixas }: { titulo: string; dias: number; quantidadeBaixas: number }) {
  return (
    <div className="rounded-2xl bg-card shadow-card p-5">
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{titulo}</p>
      <p className={cn("text-2xl font-bold tabular-nums", dias > 0 ? "text-destructive" : "text-positivo")}>
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
                <span className={cn("flex shrink-0 items-center gap-0.5 text-xs font-semibold tabular-nums", positivo ? "text-positivo" : "text-destructive")}>
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
