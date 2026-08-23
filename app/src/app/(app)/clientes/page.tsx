import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarPessoas } from "@/lib/pessoas/buscar-pessoa";
import { TabelaPessoas } from "@/components/pessoas/tabela-pessoas";
import { CtaImportarPessoas } from "@/components/pessoas/cta-importar-pessoas";
import { Button } from "@/components/ui/button";

export default async function PaginaClientes() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const clientes = await listarPessoas(supabase, { tenant_id: contexto.tenantId, perfil: "CLIENTE" });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Clientes</h1>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/clientes/novo">
            <Plus size={15} weight="bold" />
            Novo cliente
          </Link>
        </Button>
      </div>

      {clientes.length === 0 ? (
        <CtaImportarPessoas rotulo="cliente" />
      ) : (
        <TabelaPessoas pessoas={clientes} caminhoBase="clientes" textoVazio="Nenhum cliente encontrado." />
      )}
    </div>
  );
}
