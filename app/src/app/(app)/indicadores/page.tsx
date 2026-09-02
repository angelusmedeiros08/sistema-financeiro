import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUp, ArrowDown } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarConcentracao } from "@/lib/relatorios/concentracao";
import { buscarVariacaoCategorias } from "@/lib/relatorios/variacao-categorias";
import { buscarPMR, buscarPMP } from "@/lib/relatorios/prazos-medios";
import { buscarAging } from "@/lib/relatorios/aging";
import { buscarDistribuicaoFormaPagamento } from "@/lib/relatorios/distribuicao-forma-pagamento";
import { buscarSaldoProjetado, buscarSerieSaldoProjetado, type SaldoProjetado, type PontoSerieSaldo } from "@/lib/relatorios/saldo-projetado";
import { buscarLiquidezAproximada } from "@/lib/relatorios/liquidez-aproximada";
import { SaldoProjetadoChart } from "@/components/relatorios/saldo-projetado-chart";
import { TopCategoriasDonut } from "@/components/relatorios/top-categorias-donut";
import { AgingBarras } from "@/components/relatorios/aging-barras";
import { BadgeRiscoConcentracao } from "@/components/relatorios/badge-risco-concentracao";
import { BadgeRupturaSaldo } from "@/components/relatorios/badge-ruptura-saldo";
import { BadgeSaudeFinanceira } from "@/components/relatorios/badge-saude-financeira";
import { CardLiquidez } from "@/components/relatorios/card-liquidez";
import { CardCicloConversaoCaixa } from "@/components/relatorios/card-ciclo-conversao-caixa";
import { TermoComDica } from "@/components/formularios/termo-com-dica";
import { formatarMoeda, formatarPercentual, formatarIndice } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { emModoApresentacao } from "@/lib/apresentacao/sessao";
import { FocoApresentacao } from "@/components/apresentacao/foco-apresentacao";
import { hojeIsoBrasil } from "@/lib/data-brasil";

export default async function PaginaIndicadores({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");
  const { tenantId } = contexto;

  const sp = await searchParams;
  const emApresentacao = emModoApresentacao(sp);
  const foco = sp.foco;

  const supabase = await createClient();

  const origemHref = "/indicadores";
  const hoje = hojeIsoBrasil();
  const isoMenosMeses = (meses: number) => {
    const [ano, mes, dia] = hoje.split("-").map(Number);
    return new Date(Date.UTC(ano, mes - 1 - meses, dia)).toISOString().slice(0, 10);
  };

  const [
    saldoProjetado,
    serieSaldo,
    concentracaoReceita,
    concentracaoDespesa,
    variacaoReceitas,
    variacaoDespesas,
    pmr,
    pmp,
    agingReceber,
    agingPagar,
    distribuicaoFormaPagamento,
    liquidez,
  ] = await Promise.all([
    buscarSaldoProjetado(supabase, tenantId),
    buscarSerieSaldoProjetado(supabase, tenantId),
    buscarConcentracao(supabase, { tenantId, tipo: "RECEITA", origemHref }),
    buscarConcentracao(supabase, { tenantId, tipo: "DESPESA", origemHref }),
    buscarVariacaoCategorias(supabase, { tenantId, tipo: "RECEITA" }),
    buscarVariacaoCategorias(supabase, { tenantId, tipo: "DESPESA" }),
    buscarPMR(supabase, { tenantId }),
    buscarPMP(supabase, { tenantId }),
    buscarAging(supabase, { tenantId, tipo: "RECEITA" }),
    buscarAging(supabase, { tenantId, tipo: "DESPESA" }),
    buscarDistribuicaoFormaPagamento(supabase, { tenantId, origemHref }),
    buscarLiquidezAproximada(supabase, tenantId),
  ]);

  const projecaoD7 = saldoProjetado.projecoes.find((p) => p.dias === 7);
  const cicloConversaoCaixa = pmr.dias - pmp.dias;

  const paraDonut = (pessoas: typeof concentracaoReceita.pessoas) =>
    pessoas.map((c, i) => ({
      categoriaId: c.pessoaId ?? `sem-pessoa-${i}`,
      entidadeId: c.pessoaId,
      categoriaNome: c.nome,
      ehCustoFixo: false,
      total: c.valor,
      percentualDoTotal: c.percentual,
      percentualAcumulado: 0,
      href: c.href,
    }));
  const donutClientes = paraDonut(concentracaoReceita.pessoas);
  const donutFornecedores = paraDonut(concentracaoDespesa.pessoas);

  const donutFormaPagamento = distribuicaoFormaPagamento.map((f, i) => ({
    categoriaId: f.formaPagamentoId ?? `nao-informado-${i}`,
    entidadeId: f.formaPagamentoId,
    categoriaNome: f.nome,
    ehCustoFixo: false,
    total: f.valorTotal,
    percentualDoTotal: f.percentualDoTotal,
    percentualAcumulado: 0,
    href: f.href,
  }));

  // Cada seção vira um elemento nomeado — em apresentação com foco, só o
  // escolhido renderiza (ampliado, sozinho); na navegação normal, os 6 juntos
  // formam a página como sempre foi. Monta uma vez só, sem duplicar JSX.
  const secaoSaldoProjetado = (
    <section className="rounded-2xl bg-card shadow-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-base font-bold text-foreground">Saldo projetado</h2>
        {projecaoD7?.ruptura && <BadgeRupturaSaldo saldoD7={projecaoD7.saldo} />}
      </div>
      <CardSaldoProjetado {...saldoProjetado} pontos={serieSaldo.pontos} />
    </section>
  );

  const secaoConcentracao = (
    <section className="rounded-2xl bg-card shadow-card p-6">
      <h2 className="mb-4 font-heading text-base font-bold text-foreground">Concentração de receita e despesa</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Receita</h3>
            <BadgeRiscoConcentracao nivelRisco={concentracaoReceita.nivelRisco} percentualTop3={concentracaoReceita.percentualTop3} />
          </div>
          <TopCategoriasDonut
            titulo="Top clientes por receita (últimos 12 meses)"
            linhas={donutClientes}
            dimensao="pessoa"
            regime="competencia"
            tipo="RECEITA"
            periodoInicio={isoMenosMeses(12)}
            periodoFim={hoje}
            origemHref={origemHref}
          />
        </div>
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Despesa</h3>
            <BadgeRiscoConcentracao
              nivelRisco={concentracaoDespesa.nivelRisco}
              percentualTop3={concentracaoDespesa.percentualTop3}
              entidadeLabel="fornecedores"
              totalLabel="despesa"
            />
          </div>
          <TopCategoriasDonut
            titulo="Top fornecedores por despesa (últimos 12 meses)"
            linhas={donutFornecedores}
            dimensao="pessoa"
            regime="competencia"
            tipo="DESPESA"
            periodoInicio={isoMenosMeses(12)}
            periodoFim={hoje}
            origemHref={origemHref}
          />
        </div>
      </div>
    </section>
  );

  const secaoVariacaoCategorias = (
    <section className="rounded-2xl bg-card shadow-card p-6">
      <h2 className="mb-4 font-heading text-base font-bold text-foreground">Variação de categorias</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListaVariacaoCategorias titulo="Receitas — maior variação vs. mês anterior" linhas={variacaoReceitas} />
        <ListaVariacaoCategorias titulo="Despesas — maior variação vs. mês anterior" linhas={variacaoDespesas} />
      </div>
    </section>
  );

  const secaoPrazosAging = (
    <section className="rounded-2xl bg-card shadow-card p-6">
      <h2 className="mb-4 font-heading text-base font-bold text-foreground">Prazos médios e aging</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CardPrazoMedio
          titulo={<TermoComDica termo="pmr">Prazo médio de recebimento (PMR)</TermoComDica>}
          dias={pmr.dias}
          quantidadeBaixas={pmr.quantidadeBaixas}
        />
        <CardPrazoMedio
          titulo={<TermoComDica termo="pmp">Prazo médio de pagamento (PMP)</TermoComDica>}
          dias={pmp.dias}
          quantidadeBaixas={pmp.quantidadeBaixas}
        />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgingBarras titulo={<TermoComDica termo="aging">Aging — contas a receber</TermoComDica>} dados={agingReceber} />
        <AgingBarras titulo={<TermoComDica termo="aging">Aging — contas a pagar</TermoComDica>} dados={agingPagar} />
      </div>
    </section>
  );

  const secaoFormaPagamento = (
    <section className="rounded-2xl bg-card shadow-card p-6">
      <h2 className="mb-4 font-heading text-base font-bold text-foreground">Distribuição por forma de pagamento</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopCategoriasDonut
          titulo="Distribuição por forma de pagamento (últimos 6 meses)"
          linhas={donutFormaPagamento}
          dimensao="forma_pagamento"
          regime="realizado"
          periodoInicio={isoMenosMeses(6)}
          periodoFim={hoje}
          origemHref={origemHref}
        />
        <div className="rounded-2xl bg-card shadow-card p-5">
          <h3 className="mb-4 font-heading text-sm font-bold text-foreground">Atraso médio por forma</h3>
          {distribuicaoFormaPagamento.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma baixa no período.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {distribuicaoFormaPagamento.map((f) => (
                <li key={f.formaPagamentoId ?? "nao-informado"}>
                  <Link href={f.href} className="flex items-center justify-between gap-3 rounded-lg text-sm hover:bg-muted">
                    <span className="flex-1 truncate text-foreground">{f.nome}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{formatarMoeda(f.valorTotal)}</span>
                    <span className={cn("min-w-20 shrink-0 text-right text-xs font-semibold tabular-nums", f.atrasoMedioDias > 0 ? "text-destructive" : "text-positivo")}>
                      {f.atrasoMedioDias >= 0 ? "+" : ""}
                      {formatarIndice(f.atrasoMedioDias)}d
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );

  const secaoLiquidez = (
    <section className="rounded-2xl bg-card shadow-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-base font-bold text-foreground">Liquidez e ciclo de caixa</h2>
        <BadgeSaudeFinanceira nivel={liquidez.nivel} indice={liquidez.indice} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CardLiquidez {...liquidez} />
        <CardCicloConversaoCaixa dias={cicloConversaoCaixa} pmrDias={pmr.dias} pmpDias={pmp.dias} />
      </div>
    </section>
  );

  if (emApresentacao && foco) {
    const secoesPorFoco: Record<string, React.ReactNode> = {
      "saldo-projetado": secaoSaldoProjetado,
      concentracao: secaoConcentracao,
      "variacao-categorias": secaoVariacaoCategorias,
      "prazos-aging": secaoPrazosAging,
      "forma-pagamento": secaoFormaPagamento,
      liquidez: secaoLiquidez,
    };
    return <FocoApresentacao>{secoesPorFoco[foco] ?? null}</FocoApresentacao>;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Indicadores</h1>
      {secaoSaldoProjetado}
      {secaoConcentracao}
      {secaoVariacaoCategorias}
      {secaoPrazosAging}
      {secaoFormaPagamento}
      {secaoLiquidez}
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

function CardPrazoMedio({ titulo, dias, quantidadeBaixas }: { titulo: React.ReactNode; dias: number; quantidadeBaixas: number }) {
  return (
    <div className="rounded-2xl bg-card shadow-card p-5">
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{titulo}</p>
      <p className={cn("text-2xl font-bold tabular-nums", dias > 0 ? "text-destructive" : "text-positivo")}>
        {dias >= 0 ? "+" : ""}
        {formatarIndice(dias)} dias
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
  linhas: { categoriaId: string; nome: string; valorMesAtual: number; valorMesAnterior: number; variacaoPercentual: number; href: string }[];
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
              <li key={l.categoriaId}>
                <Link href={l.href} className="flex items-center gap-3 rounded-lg text-sm hover:bg-muted">
                  <span className="flex-1 truncate text-foreground">{l.nome}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{formatarMoeda(l.valorMesAtual)}</span>
                  <span className={cn("flex shrink-0 items-center gap-0.5 text-xs font-semibold tabular-nums", positivo ? "text-positivo" : "text-destructive")}>
                    {positivo ? <ArrowUp size={11} weight="bold" /> : <ArrowDown size={11} weight="bold" />}
                    {formatarPercentual(Math.abs(l.variacaoPercentual))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
