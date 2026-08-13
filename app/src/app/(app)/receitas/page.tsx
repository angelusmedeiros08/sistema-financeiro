import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { criarReceita } from "./actions";
import { EventoFinanceiroForm } from "@/components/formularios/evento-financeiro-form";
import { TabelaEventos } from "@/components/lancamentos/tabela-eventos";

export default async function PaginaReceitas() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) {
    redirect("/entrar");
  }
  const { tenantId } = contexto;

  const supabase = await createClient();

  const [{ data: categorias }, { data: pessoas }, { data: centrosCusto }, { data: eventos }] = await Promise.all([
    supabase
      .from("categorias_financeiras")
      .select("id, nome")
      .eq("tenant_id", tenantId)
      .eq("tipo", "RECEITA")
      .order("nome"),
    supabase
      .from("pessoas")
      .select("id, nome")
      .eq("tenant_id", tenantId)
      .contains("perfis", ["CLIENTE"])
      .order("nome"),
    supabase.from("centros_custo").select("id, nome").eq("tenant_id", tenantId).eq("ativo", true).order("nome"),
    supabase
      .from("eventos_financeiros")
      .select(
        "id, descricao, valor_total, data_competencia, parcelas(status, data_vencimento), rateio_categoria(categorias_financeiras(nome))",
      )
      .eq("tenant_id", tenantId)
      .eq("tipo", "RECEITA")
      .order("data_competencia", { ascending: false }),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Receitas</h1>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Nova receita</h2>
        <EventoFinanceiroForm
          tipo="RECEITA"
          categorias={categorias ?? []}
          pessoas={pessoas ?? []}
          centrosCusto={centrosCusto ?? []}
          acao={criarReceita}
        />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Lançadas</h2>
        <TabelaEventos eventos={eventos ?? []} textoVazio="Nenhuma receita registrada ainda." />
      </section>
    </div>
  );
}
