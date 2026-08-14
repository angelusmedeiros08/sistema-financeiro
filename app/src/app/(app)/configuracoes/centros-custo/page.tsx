import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { NovoCentroCustoForm } from "./novo-centro-custo-form";
import { ToggleAtivoButton } from "./toggle-ativo-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ConfiguracoesSubNav } from "../sub-nav";

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
      <ConfiguracoesSubNav />

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Novo centro de custo</h2>
        <NovoCentroCustoForm />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Cadastrados</h2>
          <div className="flex gap-1">
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
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum centro de custo {filtro === "inativos" ? "inativo" : "cadastrado"} ainda.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centros.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground">{c.codigo ?? "-"}</TableCell>
                    <TableCell className="font-medium text-foreground">{c.nome}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-none font-semibold", c.ativo ? "bg-[#157F6B]/12 text-[#0F5F50]" : "bg-muted text-muted-foreground")}>
                        {c.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ToggleAtivoButton id={c.id} ativo={c.ativo} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
