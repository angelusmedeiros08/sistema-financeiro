import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarLancamentosFiltrados, type FiltroLancamentos } from "@/lib/relatorios/lancamentos-filtrados";
import type { Regime } from "@/lib/relatorios/regime";
import { TabelaEventos } from "@/components/lancamentos/tabela-eventos";
import { formatarMoeda, formatarDataComAno } from "@/lib/formatacao";
import { caminhoInternoSeguro } from "@/lib/caminho-seguro";

// Destino de todo clique em gráfico — sempre exatamente uma dessas 4
// dimensões chega por vez; a ordem aqui só define qual vence se mais de uma
// vier junto (não deveria acontecer, mas categoria/forma de pagamento são
// as mais específicas, ficam na frente).
const DIMENSOES = [
  { param: "categoria_id", dimensao: "categoria" as const },
  { param: "forma_pagamento_id", dimensao: "forma_pagamento" as const },
  { param: "centro_custo_id", dimensao: "centro_custo" as const },
  { param: "pessoa_id", dimensao: "pessoa" as const },
];

const REGIMES: Regime[] = ["competencia", "previsto", "realizado"];

function parseValor(bruto: string | undefined): string[] | "nenhuma" | null {
  if (!bruto) return null;
  if (bruto === "nenhuma") return "nenhuma";
  return bruto.split(",").filter(Boolean);
}


// `rotulo` vem cru da querystring no caso sem dimensão (Saldo em caixa,
// Recebido/Pago do mês etc.) e vira o <h1> da página — sem validação, um
// link malicioso poderia usar esse texto pra exibir uma mensagem enganosa
// dentro do próprio domínio logado (não é XSS, o React escapa o texto, mas
// o conteúdo ainda seria arbitrário — testado ao vivo com
// "?rotulo=Sua senha expirou, ligue 0800", que renderizou sem problema
// antes desta checagem). Um filtro por alfabeto não resolve — uma frase de
// phishing inteira cabe em letras/espaços/vírgula. Em vez disso, valida
// contra os padrões exatos que `montarHrefLancamentosSemDimensao` de fato
// gera hoje (só 5 formatos, todos em `painel/page.tsx`) — qualquer outro
// texto cai num rótulo genérico (achado em revisão de código).
const MESES = "janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";
const ROTULO_SEGURO = new RegExp(`^(Todo o histórico|Recebido em (${MESES})|Pago em (${MESES})|Receitas de (${MESES})|Despesas de (${MESES}))$`);
function rotuloSeguro(bruto: string): string {
  return ROTULO_SEGURO.test(bruto) ? bruto : "Lançamentos";
}

export default async function PaginaLancamentos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const { periodo_inicio: periodoInicio, periodo_fim: periodoFim } = sp;
  const voltar = caminhoInternoSeguro(sp.voltar);
  const regime: Regime = REGIMES.includes(sp.regime as Regime) ? (sp.regime as Regime) : "competencia";
  const apenasTipo = sp.tipo === "RECEITA" || sp.tipo === "DESPESA" ? sp.tipo : undefined;

  if (!periodoInicio || !periodoFim) notFound();

  const dimensaoAtiva = DIMENSOES.find((d) => sp[d.param] !== undefined);
  let filtro: FiltroLancamentos;
  if (dimensaoAtiva) {
    const valor = parseValor(sp[dimensaoAtiva.param]);
    if (!valor) notFound();
    filtro = { dimensao: dimensaoAtiva.dimensao, valor, regime, apenasTipo };
  } else if (sp.rotulo) {
    // Sem dimensão nenhuma — Saldo em caixa, Recebido/Pago do mês etc.
    // `rotulo` presente é o que distingue esse caso de uma URL malformada
    // (sem nenhum parâmetro de dimensão nem `rotulo`, que continua caindo
    // em notFound() — nunca mostra "todos os lançamentos" por acidente).
    filtro = { regime, apenasTipo, rotulo: rotuloSeguro(sp.rotulo) };
  } else {
    notFound();
  }

  const supabase = await createClient();
  const resultado = await buscarLancamentosFiltrados(supabase, { tenantId: contexto.tenantId, filtro, periodoInicio, periodoFim });

  const rotuloQuantidade =
    dimensaoAtiva?.dimensao === "forma_pagamento"
      ? `${resultado.quantidade} pagamento${resultado.quantidade === 1 ? "" : "s"}`
      : `${resultado.quantidade} lançamento${resultado.quantidade === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {voltar && (
        <Link href={voltar} className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} />
          Voltar pro relatório
        </Link>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Lançamentos em {resultado.rotulo}</h1>
        <span className="font-heading text-2xl font-bold tabular-nums text-foreground">{formatarMoeda(resultado.total)}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {formatarDataComAno(periodoInicio)} – {formatarDataComAno(periodoFim)}
        </span>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{rotuloQuantidade}</span>
        {apenasTipo && (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {apenasTipo === "RECEITA" ? "Só entradas" : "Só saídas"}
          </span>
        )}
      </div>

      <TabelaEventos eventos={resultado.linhas} textoVazio="Nenhum lançamento encontrado nesse filtro." />
    </div>
  );
}
