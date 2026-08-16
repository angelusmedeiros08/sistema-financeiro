import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { criarDespesa } from "./actions";
import { EventoFinanceiroForm } from "@/components/formularios/evento-financeiro-form";
import { TabelaEventos } from "@/components/lancamentos/tabela-eventos";
import { CtaImportarPlanilha } from "@/components/lancamentos/cta-importar";

export default async function PaginaDespesas() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) {
    redirect("/entrar");
  }
  const { tenantId } = contexto;

  const supabase = await createClient();

  const [{ data: categorias }, { data: pessoas }, { data: centrosCusto }, { data: eventos }, { count: totalEventosTenant }] = await Promise.all([
    supabase
      .from("categorias_financeiras")
      .select("id, nome")
      .eq("tenant_id", tenantId)
      .eq("tipo", "DESPESA")
      .order("nome"),
    supabase
      .from("pessoas")
      .select("id, nome")
      .eq("tenant_id", tenantId)
      .contains("perfis", ["FORNECEDOR"])
      .order("nome"),
    supabase.from("centros_custo").select("id, nome").eq("tenant_id", tenantId).eq("ativo", true).order("nome"),
    supabase
      .from("eventos_financeiros")
      .select(
        "id, descricao, valor_total, data_competencia, parcelas(status, data_vencimento), rateio_categoria(categorias_financeiras(nome))",
      )
      .eq("tenant_id", tenantId)
      .eq("tipo", "DESPESA")
      .order("data_competencia", { ascending: false }),
    supabase.from("eventos_financeiros").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Despesas</h1>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Nova despesa</h2>
        <EventoFinanceiroForm
          tipo="DESPESA"
          categorias={categorias ?? []}
          pessoas={pessoas ?? []}
          centrosCusto={centrosCusto ?? []}
          acao={criarDespesa}
        />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Lançadas</h2>
        {!totalEventosTenant ? <CtaImportarPlanilha /> : <TabelaEventos eventos={eventos ?? []} textoVazio="Nenhuma despesa registrada ainda." />}
      </section>
    </div>
  );
}
