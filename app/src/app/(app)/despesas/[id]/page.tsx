import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarEventoParaEdicao } from "@/lib/contabil/buscar-evento";
import { EditarEventoFinanceiro } from "@/components/lancamentos/editar-evento-financeiro";
import { editarDespesa } from "../actions";

export default async function PaginaEditarDespesa({ params }: { params: Promise<{ id: string }> }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");
  const { tenantId } = contexto;

  const { id } = await params;
  const supabase = await createClient();

  const [evento, { data: categorias }, { data: pessoas }, { data: centrosCusto }] = await Promise.all([
    buscarEventoParaEdicao(supabase, { tenant_id: tenantId, evento_id: id, tipo: "DESPESA" }),
    supabase.from("categorias_financeiras").select("id, nome").eq("tenant_id", tenantId).eq("tipo", "DESPESA").order("nome"),
    supabase.from("pessoas").select("id, nome").eq("tenant_id", tenantId).contains("perfis", ["FORNECEDOR"]).order("nome"),
    supabase.from("centros_custo").select("id, nome").eq("tenant_id", tenantId).eq("ativo", true).order("nome"),
  ]);

  if (!evento) notFound();

  if (evento.estornado) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/despesas" className="text-sm text-muted-foreground hover:text-foreground">
          ← Despesas
        </Link>
        <div className="rounded-2xl bg-card shadow-card p-5">
          <p className="text-sm font-medium text-foreground">{evento.descricao}</p>
          <p className="mt-1 text-sm text-muted-foreground">Este lançamento foi estornado e não pode mais ser editado.</p>
        </div>
      </div>
    );
  }

  return (
    <EditarEventoFinanceiro
      evento={evento}
      caminhoBase="despesas"
      categorias={categorias ?? []}
      pessoas={pessoas ?? []}
      centrosCusto={centrosCusto ?? []}
      acao={editarDespesa.bind(null, id)}
    />
  );
}
