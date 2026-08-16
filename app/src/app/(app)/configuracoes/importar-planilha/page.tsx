import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarEntidadesExistentes } from "@/lib/importacao/resolucao";
import { ConfiguracoesSubNav } from "../sub-nav";
import { ImportarPlanilhaWizard } from "./wizard";

export default async function PaginaImportarPlanilha() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();

  const [{ data: contasFinanceiras }, entidadesExistentes] = await Promise.all([
    supabase.from("contas_financeiras").select("id, nome").eq("tenant_id", contexto.tenantId).eq("ativo", true).order("nome"),
    buscarEntidadesExistentes(supabase, contexto.tenantId),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Importar planilha</h1>
      <ConfiguracoesSubNav />

      {!contasFinanceiras || contasFinanceiras.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Cadastre uma conta financeira antes de importar — a importação precisa de uma conta pra registrar as baixas automáticas.
        </p>
      ) : (
        <ImportarPlanilhaWizard contasFinanceiras={contasFinanceiras} entidadesExistentesIniciais={entidadesExistentes} />
      )}
    </div>
  );
}
