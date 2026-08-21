import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { lerParametrosRelatorio } from "@/lib/relatorios/periodo";
import { buscarFluxoCaixaGrade, buscarPrevistoRealizado } from "@/lib/relatorios/fluxo-caixa";
import { RelatoriosControles } from "../relatorios/controles";
import { ComparativoBarras } from "@/components/relatorios/comparativo-barras";
import { FluxoDiarioTabela, FluxoPrevistoRealizadoTabela } from "@/components/relatorios/fluxo-caixa-tabelas";
import { cn } from "@/lib/utils";

const ABAS = [
  { valor: "diario", rotulo: "Diário" },
  { valor: "previsto_realizado", rotulo: "Previsto × Realizado" },
] as const;

export default async function PaginaFluxoCaixa({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const params = lerParametrosRelatorio(sp);
  const aba = sp.aba === "previsto_realizado" ? "previsto_realizado" : "diario";

  const supabase = await createClient();

  function hrefAba(valor: string) {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]);
    p.set("aba", valor);
    return `/fluxo-caixa?${p.toString()}`;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Fluxo de caixa</h1>
      <RelatoriosControles {...params} />

      <div className="flex gap-1">
        {ABAS.map((a) => (
          <Link
            key={a.valor}
            href={hrefAba(a.valor)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              aba === a.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {a.rotulo}
          </Link>
        ))}
      </div>

      {aba === "diario" ? (
        <FluxoDiario tenantId={contexto.tenantId} params={params} supabase={supabase} />
      ) : (
        <FluxoPrevistoRealizado tenantId={contexto.tenantId} params={params} supabase={supabase} />
      )}
    </div>
  );
}

async function FluxoDiario({
  tenantId,
  params,
  supabase,
}: {
  tenantId: string;
  params: ReturnType<typeof lerParametrosRelatorio>;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const pontos = await buscarFluxoCaixaGrade(supabase, { tenantId, ...params });

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-card shadow-card p-5">
        <h2 className="mb-4 font-heading text-sm font-bold text-foreground">Entradas × Saídas</h2>
        <ComparativoBarras
          dados={pontos.map((p) => ({ chave: p.chave, entradas: p.entradas, saidas: -p.saidas }))}
          eixoX="chave"
          series={[
            { chave: "entradas", nome: "Entradas", cor: "#157F6B" },
            { chave: "saidas", nome: "Saídas", cor: "#B23A2E" },
          ]}
        />
      </div>

      <FluxoDiarioTabela pontos={pontos} />
    </div>
  );
}

async function FluxoPrevistoRealizado({
  tenantId,
  params,
  supabase,
}: {
  tenantId: string;
  params: ReturnType<typeof lerParametrosRelatorio>;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const pontos = await buscarPrevistoRealizado(supabase, {
    tenantId,
    granularidade: params.granularidade,
    dataInicio: params.dataInicio,
    dataFim: params.dataFim,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-card shadow-card p-5">
        <h2 className="mb-4 font-heading text-sm font-bold text-foreground">Vencimento previsto × Pagamento realizado</h2>
        <ComparativoBarras
          dados={pontos}
          eixoX="chave"
          series={[
            { chave: "previsto", nome: "Previsto", cor: "#E3A62F" },
            { chave: "realizado", nome: "Realizado", cor: "#157F6B" },
          ]}
        />
      </div>

      <FluxoPrevistoRealizadoTabela pontos={pontos} />
    </div>
  );
}
