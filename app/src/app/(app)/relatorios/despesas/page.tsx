import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarAnaliseCategorias } from "@/lib/relatorios/analise-despesas";
import { RelatoriosSubNav } from "../sub-nav";
import { RelatoriosControles } from "../controles";
import { DespesasTabela } from "@/components/relatorios/despesas-tabela";

export default async function PaginaRelatoriosDespesas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const params = lerParametrosRelatorio(await searchParams);
  const supabase = await createClient();
  const linhas = await buscarAnaliseCategorias(supabase, { tenantId: contexto.tenantId, ...params, tipo: "DESPESA", origemHref: "/relatorios/despesas" });

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
      <RelatoriosSubNav />
      <RelatoriosControles {...params} />

      <p className="text-xs text-muted-foreground">
        Categorias ordenadas do maior para o menor gasto, com participação e acumulado. Identifica quais poucas
        categorias respondem pela maior parte da despesa.
      </p>

      <DespesasTabela linhas={linhas} />
    </div>
  );
}
