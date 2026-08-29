import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarEntidadesExistentes } from "@/lib/importacao/resolucao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { ImportarIAWizard } from "./wizard";

export default async function PaginaImportarIA() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();

  const [{ data: contasFinanceiras }, entidadesExistentes] = await Promise.all([
    supabase.from("contas_financeiras").select("id, nome").eq("tenant_id", contexto.tenantId).eq("ativo", true).order("nome"),
    buscarEntidadesExistentes(supabase, contexto.tenantId),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/importacao" className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} />
        Importação
      </Link>
      <h1 className="text-xl font-bold tracking-tight text-foreground">Importar com IA</h1>

      {!contasFinanceiras || contasFinanceiras.length === 0 ? (
        <EstadoVazio texto="Cadastre uma conta financeira antes de importar — a importação precisa de uma conta pra registrar as baixas automáticas." />
      ) : (
        <ImportarIAWizard contasFinanceiras={contasFinanceiras} entidadesExistentesIniciais={entidadesExistentes} />
      )}
    </div>
  );
}
