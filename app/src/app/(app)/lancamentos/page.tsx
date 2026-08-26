import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarLancamentosFiltrados, type FiltroLancamentos } from "@/lib/relatorios/lancamentos-filtrados";
import { TabelaEventos } from "@/components/lancamentos/tabela-eventos";
import { formatarMoeda, formatarDataComAno } from "@/lib/formatacao";

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

function parseValor(bruto: string | undefined): string[] | "nenhuma" | null {
  if (!bruto) return null;
  if (bruto === "nenhuma") return "nenhuma";
  return bruto.split(",").filter(Boolean);
}

export default async function PaginaLancamentos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const { periodo_inicio: periodoInicio, periodo_fim: periodoFim, voltar } = sp;

  const dimensaoAtiva = DIMENSOES.find((d) => sp[d.param] !== undefined);
  const valor = dimensaoAtiva ? parseValor(sp[dimensaoAtiva.param]) : null;
  if (!dimensaoAtiva || !valor || !periodoInicio || !periodoFim) notFound();

  const filtro: FiltroLancamentos = { dimensao: dimensaoAtiva.dimensao, valor };

  const supabase = await createClient();
  const resultado = await buscarLancamentosFiltrados(supabase, { tenantId: contexto.tenantId, filtro, periodoInicio, periodoFim });

  const rotuloQuantidade =
    dimensaoAtiva.dimensao === "forma_pagamento"
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
      </div>

      <TabelaEventos eventos={resultado.linhas} textoVazio="Nenhum lançamento encontrado nesse filtro." />
    </div>
  );
}
