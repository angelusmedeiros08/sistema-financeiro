import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarCamposPersonalizados } from "@/lib/pessoas/buscar-pessoa";
import { ConfiguracoesSubNav } from "../sub-nav";
import { ImportarPessoasWizard } from "./wizard";

export default async function PaginaImportarPessoas() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();

  const [{ data: pessoasExistentes }, camposPersonalizados] = await Promise.all([
    supabase.from("pessoas").select("id, nome, documento, perfis").eq("tenant_id", contexto.tenantId),
    listarCamposPersonalizados(supabase, { tenant_id: contexto.tenantId, apenasDisponiveis: true }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Importar clientes/fornecedores</h1>
      <ConfiguracoesSubNav />

      <ImportarPessoasWizard pessoasExistentesIniciais={pessoasExistentes ?? []} camposPersonalizados={camposPersonalizados} />
    </div>
  );
}
