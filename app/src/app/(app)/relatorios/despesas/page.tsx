import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarAnaliseCategorias } from "@/lib/relatorios/analise-despesas";
import { RelatoriosSubNav } from "../sub-nav";
import { RelatoriosControles } from "../controles";
import { Badge } from "@/components/ui/badge";
import { TrilhoBarra } from "@/components/relatorios/trilho-barra";
import { formatarMoeda, formatarNumeroCompacto, formatarPercentual } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

export default async function PaginaRelatoriosDespesas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const params = lerParametrosRelatorio(await searchParams);
  const supabase = await createClient();
  const linhas = await buscarAnaliseCategorias(supabase, { tenantId: contexto.tenantId, ...params, tipo: "DESPESA" });
  const maior = Math.max(...linhas.map((l) => l.total), 1);

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
      <RelatoriosSubNav />
      <RelatoriosControles {...params} />

      <div className="rounded-2xl bg-card shadow-card p-5">
        <h2 className="mb-1 font-heading text-sm font-bold text-foreground">Análise de despesas (curva ABC)</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Categorias ordenadas do maior para o menor gasto, com participação e acumulado. Identifica quais poucas
          categorias respondem pela maior parte da despesa.
        </p>

        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma despesa categorizada no período selecionado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Categoria</th>
                <th className="py-2">Tipo</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">% do total</th>
                <th className="py-2 text-right">% acumulado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.categoriaId} className="border-b border-border last:border-none">
                  <td className="py-2.5">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">{l.categoriaNome}</span>
                      <div className="w-full max-w-40">
                        <TrilhoBarra valorPercentual={l.total / maior} cor="#B23A2E" espessura={5} valorFormatado={formatarMoeda(l.total)} />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <Badge className={cn("border-none font-semibold", l.ehCustoFixo ? "bg-[#7A8B5C]/12 text-[#4F5C3A]" : "bg-muted text-muted-foreground")}>
                      {l.ehCustoFixo ? "Fixo" : "Variável"}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-right tabular-nums font-semibold text-foreground">{formatarNumeroCompacto(l.total)}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{formatarPercentual(l.percentualDoTotal)}</td>
                  <td className={cn("py-2.5 text-right tabular-nums", l.percentualAcumulado <= 0.8 ? "font-semibold text-[#C98A1F]" : "text-muted-foreground")}>
                    {formatarPercentual(l.percentualAcumulado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
