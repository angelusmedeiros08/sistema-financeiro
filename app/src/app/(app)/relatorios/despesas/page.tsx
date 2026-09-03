import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarAnaliseCategorias } from "@/lib/relatorios/analise-despesas";
import { RelatoriosSubNav } from "../sub-nav";
import { RelatoriosControles } from "../controles";
import { DespesasTabela } from "@/components/relatorios/despesas-tabela";
import { TituloPagina } from "@/components/layout/titulo-pagina";

export default async function PaginaRelatoriosDespesas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const spBrutos = await searchParams;
  const params = lerParametrosRelatorio(spBrutos);
  const supabase = await createClient();
  const qsAtual = new URLSearchParams(Object.entries(spBrutos).filter((par): par is [string, string] => par[1] !== undefined)).toString();
  const origemHref = `/relatorios/despesas${qsAtual ? `?${qsAtual}` : ""}`;
  const linhas = await buscarAnaliseCategorias(supabase, { tenantId: contexto.tenantId, ...params, tipo: "DESPESA", origemHref });

  return (
    <div className="flex w-full items-start gap-8">
      <RelatoriosSubNav />
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <TituloPagina>Relatórios</TituloPagina>
        <RelatoriosControles {...params} />

        <p className="text-xs text-muted-foreground">
          Categorias ordenadas do maior para o menor gasto, com participação e acumulado. Identifica quais poucas
          categorias respondem pela maior parte da despesa.
        </p>

        <DespesasTabela linhas={linhas} />
      </div>
    </div>
  );
}
