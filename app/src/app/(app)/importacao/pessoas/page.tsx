import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarCamposPersonalizados } from "@/lib/pessoas/buscar-pessoa";
import { buscarRegrasMapeamento } from "@/lib/importacao/regras-mapeamento";
import { ImportarPessoasWizard } from "./wizard";

export default async function PaginaImportarPessoas() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();

  const [{ data: pessoasExistentes }, camposPersonalizados, regrasMapeamento] = await Promise.all([
    supabase.from("pessoas").select("id, nome, documento, perfis, email, telefone").eq("tenant_id", contexto.tenantId).order("nome"),
    listarCamposPersonalizados(supabase, { tenant_id: contexto.tenantId, apenasDisponiveis: true }),
    buscarRegrasMapeamento(supabase, contexto.tenantId, "pessoas"),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/importacao" className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} />
        Importação
      </Link>
      <h1 className="text-xl font-bold tracking-tight text-foreground">Importar clientes/fornecedores</h1>

      <ImportarPessoasWizard
        pessoasExistentesIniciais={pessoasExistentes ?? []}
        camposPersonalizados={camposPersonalizados}
        regrasMapeamentoIniciais={regrasMapeamento}
      />
    </div>
  );
}
