import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarCategorias } from "@/lib/contabil/categorias";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { cn } from "@/lib/utils";
import { ConfiguracoesSubNav } from "../sub-nav";
import { NovaCategoriaForm } from "./nova-categoria-form";
import { CategoriaLinha } from "./categoria-linha";

const TIPOS = [
  { valor: "RECEITA", rotulo: "Receitas" },
  { valor: "DESPESA", rotulo: "Despesas" },
] as const;

export default async function PaginaCategorias({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const tipo: "RECEITA" | "DESPESA" = sp.tipo === "DESPESA" ? "DESPESA" : "RECEITA";

  const supabase = await createClient();
  const [categorias, contasContabeisResultado] = await Promise.all([
    listarCategorias(supabase, { tenantId: contexto.tenantId, tipo }),
    supabase
      .from("contas_contabeis")
      .select("id, codigo, nome")
      .eq("tenant_id", contexto.tenantId)
      .eq("tipo", tipo === "RECEITA" ? "RECEITA" : "DESPESA")
      .order("codigo"),
  ]);
  const contasContabeis = contasContabeisResultado.data ?? [];
  const raizes = categorias.filter((c) => !c.categoriaPaiId);
  const paisComFilhos = new Set(categorias.filter((c) => c.categoriaPaiId).map((c) => c.categoriaPaiId));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Categorias</h1>
      <ConfiguracoesSubNav />

      <div className="flex gap-1">
        {TIPOS.map((t) => (
          <Link
            key={t.valor}
            href={`/configuracoes/categorias?tipo=${t.valor}`}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              tipo === t.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t.rotulo}
          </Link>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Nova categoria de {tipo === "RECEITA" ? "receita" : "despesa"}
        </h2>
        <NovaCategoriaForm tipo={tipo} categorias={categorias} contasContabeis={contasContabeis} />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Cadastradas</h2>
        {categorias.length === 0 ? (
          <EstadoVazio texto={`Nenhuma categoria de ${tipo === "RECEITA" ? "receita" : "despesa"} ainda.`} />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nome</TableHead>
                  <TableHead>Conta contábil</TableHead>
                  <TableHead>Ponto de equilíbrio</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map((categoria) => (
                  <CategoriaLinha
                    key={categoria.id}
                    categoria={categoria}
                    raizes={raizes}
                    contasContabeis={contasContabeis}
                    temFilhos={paisComFilhos.has(categoria.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
