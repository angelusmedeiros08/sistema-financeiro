import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarAnaliseComparativa, type TipoAnaliseComparativa } from "@/lib/relatorios/analises-comparativas";
import { RelatoriosSubNav } from "../sub-nav";
import { RelatoriosControles } from "../controles";
import { ComparativoBarras } from "@/components/relatorios/comparativo-barras";
import { formatarNumeroCompacto, formatarPercentual } from "@/lib/formatacao";
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

  const supabase = await createClient();
  const pontos = await buscarAnaliseComparativa(supabase, { tenantId: contexto.tenantId, tipo: tipoAtivo, ...params });

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

      <div className="rounded-2xl bg-card shadow-card p-5">
        <h2 className="mb-4 font-heading text-sm font-bold text-foreground">{config.rotulo}</h2>

        {pontos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem movimentação suficiente no período para comparar.</p>
        ) : (
          <>
            <ComparativoBarras
              dados={pontos}
              eixoX="chave"
              series={[
                { chave: "atual", nome: "Período", cor: "#4C7DF0" },
                { chave: "comparacao", nome: config.colunaComparacao, cor: "#B45FC7" },
              ]}
            />

            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Período</th>
                  <th className="py-2 text-right">Resultado</th>
                  <th className="py-2 text-right">{config.colunaComparacao}</th>
                  {tipoAtivo !== "YTD" && <th className="py-2 text-right">Variação</th>}
                </tr>
              </thead>
              <tbody>
                {pontos.map((p) => (
                  <tr key={p.chave} className="border-b border-border last:border-none">
                    <td className="py-2.5 font-medium text-foreground">{p.chave}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatarNumeroCompacto(p.atual)}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">{formatarNumeroCompacto(p.comparacao)}</td>
                    {tipoAtivo !== "YTD" && (
                      <td className={cn("py-2.5 text-right tabular-nums font-semibold", p.variacaoPercentual >= 0 ? "text-[#157F6B]" : "text-[#B23A2E]")}>
                        {formatarPercentual(p.variacaoPercentual)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
