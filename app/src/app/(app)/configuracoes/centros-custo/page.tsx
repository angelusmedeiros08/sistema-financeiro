import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { NovoCentroCustoForm } from "./novo-centro-custo-form";
import { TabelaCentrosCusto } from "./tabela-centros-custo";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { cn } from "@/lib/utils";

const FILTROS = [
  { valor: "ativos", rotulo: "Ativos" },
  { valor: "inativos", rotulo: "Inativos" },
  { valor: "todos", rotulo: "Todos" },
] as const;

export default async function PaginaCentrosCusto({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { filtro = "ativos" } = await searchParams;

  const supabase = await createClient();
  let query = supabase
    .from("centros_custo")
    .select("id, codigo, nome, ativo")
    .eq("tenant_id", contexto.tenantId)
    .order("nome");

  if (filtro === "ativos") query = query.eq("ativo", true);
  if (filtro === "inativos") query = query.eq("ativo", false);

  const { data: centros } = await query;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Centros de custo</h1>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Novo centro de custo</h2>
        <NovoCentroCustoForm />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex justify-end">
          <div className="flex flex-wrap gap-1">
            {FILTROS.map((f) => (
              <Link
                key={f.valor}
                href={`/configuracoes/centros-custo?filtro=${f.valor}`}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  filtro === f.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {f.rotulo}
              </Link>
            ))}
          </div>
        </div>

        {!centros || centros.length === 0 ? (
          <EstadoVazio
            texto={`Nenhum centro de custo ${filtro === "inativos" ? "inativo" : "cadastrado"} ainda.`}
          />
        ) : (
          <TabelaCentrosCusto centros={centros} />
        )}
      </section>
    </div>
  );
}
