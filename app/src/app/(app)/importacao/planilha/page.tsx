import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarEntidadesExistentes } from "@/lib/importacao/resolucao";
import { buscarRegrasMapeamento } from "@/lib/importacao/regras-mapeamento";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { ImportarPlanilhaWizard } from "./wizard";
import { TituloPagina } from "@/components/layout/titulo-pagina";

export default async function PaginaImportarPlanilha() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();

  const [{ data: contasFinanceiras }, entidadesExistentes, regrasMapeamento] = await Promise.all([
    supabase.from("contas_financeiras").select("id, nome").eq("tenant_id", contexto.tenantId).eq("ativo", true).order("nome"),
    buscarEntidadesExistentes(supabase, contexto.tenantId),
    buscarRegrasMapeamento(supabase, contexto.tenantId, "financeiro"),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/importacao" className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} />
        Importação
      </Link>
      <TituloPagina>Importar planilha</TituloPagina>

      {!contasFinanceiras || contasFinanceiras.length === 0 ? (
        <EstadoVazio texto="Cadastre uma conta financeira antes de importar — a importação precisa de uma conta pra registrar as baixas automáticas." />
      ) : (
        <ImportarPlanilhaWizard
          contasFinanceiras={contasFinanceiras}
          entidadesExistentesIniciais={entidadesExistentes}
          regrasMapeamentoIniciais={regrasMapeamento}
        />
      )}
    </div>
  );
}
