import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { createClient } from "@/utils/supabase/server";
import { ImportarProdutosWizard } from "./wizard";

export default async function PaginaImportarProdutos() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const { data: categorias } = await supabase
    .from("categorias_financeiras")
    .select("id, nome")
    .eq("tenant_id", contexto.tenantId)
    .eq("tipo", "RECEITA")
    .order("nome");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/importacao" className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} />
        Importação
      </Link>
      <h1 className="text-xl font-bold tracking-tight text-foreground">Importar produtos</h1>

      <ImportarProdutosWizard categoriasReceitaIniciais={categorias ?? []} />
    </div>
  );
}
