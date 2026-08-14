import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarDRE } from "@/lib/relatorios/dre";
import { RelatoriosSubNav } from "../sub-nav";
import { RelatoriosControles } from "../controles";
import { formatarMoeda } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

export default async function PaginaRelatoriosDre({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const params = lerParametrosRelatorio(sp);
  const detalhado = sp.detalhe !== "0";

  const supabase = await createClient();
  const linhas = await buscarDRE(supabase, { tenantId: contexto.tenantId, ...params });
  const linhasVisiveis = detalhado ? linhas : linhas.filter((l) => l.tipo === "SUBTOTAL");

  const hrefToggle = () => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]);
    p.set("detalhe", detalhado ? "0" : "1");
    return `/relatorios/dre?${p.toString()}`;
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
        <Link
          href="/configuracoes/estrutura-dre"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Configurar estrutura da DRE
        </Link>
      </div>

      <RelatoriosSubNav />
      <RelatoriosControles {...params} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold text-foreground">DRE — Demonstrativo de Resultado</h2>
          <Link
            href={hrefToggle()}
            className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/70"
          >
            {detalhado ? "Ver resumido" : "Ver detalhado"}
          </Link>
        </div>

        {linhasVisiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma linha de DRE configurada ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Linha</th>
                <th className="py-2 text-right">Valor do período</th>
                <th className="py-2 text-right">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {linhasVisiveis.map((linha) => (
                <tr
                  key={linha.id}
                  className={cn(
                    "border-b border-border last:border-none",
                    linha.tipo === "SUBTOTAL" && "bg-muted/40 font-bold",
                  )}
                >
                  <td className={cn("py-2.5", linha.tipo === "FOLHA" && "pl-4 font-normal text-muted-foreground")}>
                    {linha.rotulo}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {linha.tipo === "FOLHA" ? formatarMoeda(linha.valorDireto) : "—"}
                  </td>
                  <td
                    className={cn(
                      "py-2.5 text-right tabular-nums",
                      linha.valorAcumulado >= 0 ? "text-[#157F6B]" : "text-[#D8583A]",
                    )}
                  >
                    {formatarMoeda(linha.valorAcumulado)}
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
