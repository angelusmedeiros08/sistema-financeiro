import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarAnaliseComparativa, type TipoAnaliseComparativa } from "@/lib/relatorios/analises-comparativas";
import { limitesDoMes } from "@/lib/relatorios/regime";
import { montarHrefLancamentosSemDimensao } from "@/lib/relatorios/drill-down";
import { RelatoriosSubNav } from "../sub-nav";
import { RelatoriosControles } from "../controles";
import { ComparativoLinhaAnotada } from "@/components/relatorios/comparativo-linha-anotada";
import { ComparativosTabela } from "@/components/relatorios/comparativos-tabela";
import { cn } from "@/lib/utils";

const TIPOS: { valor: TipoAnaliseComparativa; rotulo: string; colunaComparacao: string }[] = [
  { valor: "AH", rotulo: "Análise horizontal (mês vs. mês anterior)", colunaComparacao: "Mês anterior" },
  { valor: "YOY", rotulo: "Ano contra ano", colunaComparacao: "Mesmo mês, ano anterior" },
  { valor: "YTD", rotulo: "Acumulado no ano", colunaComparacao: "Acumulado" },
];

export default async function PaginaRelatoriosComparativos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const params = lerParametrosRelatorio(sp);
  const tipoAtivo = TIPOS.find((t) => t.valor === sp.tipo)?.valor ?? "AH";
  const config = TIPOS.find((t) => t.valor === tipoAtivo)!;

  // Preserva regime/tipo/período na URL — "Voltar pro relatório" a partir
  // de um ponto clicado cai na mesma visão que a pessoa estava vendo.
  const qsAtual = new URLSearchParams(Object.entries(sp).filter((par): par is [string, string] => par[1] !== undefined)).toString();
  const origemHref = `/relatorios/comparativos${qsAtual ? `?${qsAtual}` : ""}`;

  const supabase = await createClient();
  const pontos = await buscarAnaliseComparativa(supabase, { tenantId: contexto.tenantId, tipo: tipoAtivo, ...params });

  const hrefsPorPonto = pontos.map((p) => {
    const { inicio, fim } = limitesDoMes(p.chave);
    const nomeMesPonto = new Date(inicio + "T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return montarHrefLancamentosSemDimensao({
      regime: params.regime,
      periodoInicio: inicio,
      periodoFim: fim,
      rotulo: `Movimento de ${nomeMesPonto}`,
      origemHref,
    });
  });

  function hrefTipo(valor: string) {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]);
    p.set("tipo", valor);
    return `/relatorios/comparativos?${p.toString()}`;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
      <RelatoriosSubNav />
      <RelatoriosControles {...params} />

      <div className="flex flex-wrap gap-1">
        {TIPOS.map((t) => (
          <Link
            key={t.valor}
            href={hrefTipo(t.valor)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              tipoAtivo === t.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t.rotulo}
          </Link>
        ))}
      </div>

      {pontos.length === 0 ? (
        <div className="rounded-2xl bg-card shadow-card p-5">
          <h2 className="mb-4 font-heading text-sm font-bold text-foreground">{config.rotulo}</h2>
          <p className="text-sm text-muted-foreground">Sem movimentação suficiente no período para comparar.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-card shadow-card p-5">
            <h2 className="mb-4 font-heading text-sm font-bold text-foreground">{config.rotulo}</h2>
            <ComparativoLinhaAnotada
              pontos={pontos}
              nomeComparacao={config.colunaComparacao}
              mostrarAnotacao={tipoAtivo !== "YTD"}
              hrefsPorPonto={hrefsPorPonto}
            />
          </div>

          <ComparativosTabela
            titulo={config.rotulo}
            pontos={pontos}
            colunaComparacao={config.colunaComparacao}
            mostrarVariacao={tipoAtivo !== "YTD"}
            hrefsPorPonto={hrefsPorPonto}
          />
        </>
      )}
    </div>
  );
}
