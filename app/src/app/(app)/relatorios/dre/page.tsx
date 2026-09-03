import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarDREMatriz, buscarDREIndicadores } from "@/lib/relatorios/dre";
import type { Regime } from "@/lib/relatorios/regime";
import { RelatoriosSubNav } from "../sub-nav";
import { DreControles } from "./dre-controles";
import { emModoApresentacao } from "@/lib/apresentacao/sessao";
import { WaterfallDre } from "@/components/relatorios/waterfall-dre";
import { IndicadoresDreChart } from "@/components/relatorios/indicadores-dre-chart";
import { DreMatrizTabela } from "@/components/relatorios/dre-matriz-tabela";
import { hojeIsoBrasil } from "@/lib/data-brasil";
import { TituloPagina } from "@/components/layout/titulo-pagina";

const REGIMES: { valor: Regime; rotulo: string }[] = [
  { valor: "competencia", rotulo: "Competência" },
  { valor: "previsto", rotulo: "Vencimento previsto" },
  { valor: "realizado", rotulo: "Pagamento realizado" },
];

const ABAS = [
  { valor: "matriz", rotulo: "Matriz mensal" },
  { valor: "cascata", rotulo: "Cascata" },
  { valor: "indicadores", rotulo: "Indicadores" },
] as const;

export default async function PaginaRelatoriosDre({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const regime: Regime = REGIMES.some((r) => r.valor === sp.regime) ? (sp.regime as Regime) : "competencia";
  const ano = Number(sp.ano) || Number(hojeIsoBrasil().slice(0, 4));
  const detalhado = sp.detalhe !== "0";
  const aba = ABAS.some((a) => a.valor === sp.aba) ? sp.aba! : "matriz";
  const emApresentacao = emModoApresentacao(sp);

  function href(overrides: Record<string, string>) {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]);
    for (const [chave, valor] of Object.entries(overrides)) p.set(chave, valor);
    return `/relatorios/dre?${p.toString()}`;
  }
  const origemHref = href({});

  const supabase = await createClient();
  const [linhas, indicadores] = await Promise.all([
    buscarDREMatriz(supabase, { tenantId: contexto.tenantId, regime, ano, origemHref }),
    buscarDREIndicadores(supabase, { tenantId: contexto.tenantId, regime, ano }),
  ]);
  const linhasVisiveis = detalhado ? linhas : linhas.filter((l) => l.tipoCalc !== "FOLHA");

  return (
    <div className="flex w-full items-start gap-8">
      <RelatoriosSubNav />
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <TituloPagina>Relatórios</TituloPagina>
          {!emApresentacao && (
            <Link href="/configuracoes/estrutura-dre" className="text-xs font-semibold text-primary hover:underline">
              Configurar estrutura da DRE
            </Link>
          )}
        </div>

        {/* Regime é filtro de dado, o seletor de visão (Matriz/Cascata/
            Indicadores) é modo de exibição — cada visualização vive na sua
            própria aba, com o canvas inteiro pra ela (23 linhas reais não
            cabem legíveis dividindo espaço com outras duas seções). */}
        <DreControles regime={regime} ano={ano} aba={aba} />

        {aba === "indicadores" && (
          <div className="rounded-2xl bg-card shadow-card p-6">
            <h2 className="mb-1 font-heading text-base font-bold text-foreground">Indicadores: evolução no ano</h2>
            <p className="mb-5 text-xs text-muted-foreground">
              Margem de contribuição, margem bruta, EBITDA e margem líquida, todas em % sobre a receita líquida.
              Leitura direta das linhas correspondentes da matriz, mês a mês — mesmo se você reordenar a estrutura da DRE.
            </p>
            <IndicadoresDreChart dados={indicadores} altura={420} />
          </div>
        )}

        {aba === "cascata" && (
          <div className="rounded-2xl bg-card shadow-card p-6">
            <h2 className="mb-1 font-heading text-base font-bold text-foreground">DRE em cascata ({ano})</h2>
            <p className="mb-5 text-xs text-muted-foreground">Total do ano, linha a linha, na ordem real de tbTotalizadoresDRE.</p>
            <WaterfallDre linhas={linhas.map((l) => ({ rotulo: l.rotulo, tipoCalc: l.tipoCalc, valorDireto: l.total, href: l.hrefTotal }))} altura={520} />
          </div>
        )}

        {aba === "matriz" && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <Link
                href={href({ detalhe: detalhado ? "0" : "1" })}
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/70"
              >
                {detalhado ? "Ver resumido" : "Ver detalhado"}
              </Link>
            </div>

            {linhasVisiveis.length === 0 ? (
              <div className="rounded-2xl bg-card shadow-card p-6">
                <p className="text-sm text-muted-foreground">Nenhuma linha de DRE configurada ainda.</p>
              </div>
            ) : (
              <DreMatrizTabela linhas={linhasVisiveis} ano={ano} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
