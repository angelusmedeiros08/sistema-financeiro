import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarEventoParaEdicao } from "@/lib/contabil/buscar-evento";
import { EditarEventoFinanceiro } from "@/components/lancamentos/editar-evento-financeiro";
import { editarReceita } from "../actions";

export default async function PaginaEditarReceita({ params }: { params: Promise<{ id: string }> }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");
  const { tenantId } = contexto;

  const { id } = await params;
  const supabase = await createClient();

  const [evento, { data: categorias }, { data: pessoas }, { data: centrosCusto }] = await Promise.all([
    buscarEventoParaEdicao(supabase, { tenant_id: tenantId, evento_id: id, tipo: "RECEITA" }),
    supabase.from("categorias_financeiras").select("id, nome").eq("tenant_id", tenantId).eq("tipo", "RECEITA").order("nome"),
    supabase.from("pessoas").select("id, nome").eq("tenant_id", tenantId).contains("perfis", ["CLIENTE"]).order("nome"),
    supabase.from("centros_custo").select("id, nome").eq("tenant_id", tenantId).eq("ativo", true).order("nome"),
  ]);

  if (!evento) notFound();

  if (evento.estornado) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
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
      caminhoBase="receitas"
      categorias={categorias ?? []}
      pessoas={pessoas ?? []}
      centrosCusto={centrosCusto ?? []}
      acao={editarReceita.bind(null, id)}
    />
  );
}
