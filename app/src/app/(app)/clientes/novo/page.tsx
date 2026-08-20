import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarCamposPersonalizados } from "@/lib/pessoas/buscar-pessoa";
import { PessoaForm } from "@/components/pessoas/pessoa-form";
import { criarPessoaAction } from "@/lib/pessoas/pessoas-actions";

export default async function PaginaNovoCliente() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const campos = await listarCamposPersonalizados(supabase, { tenant_id: contexto.tenantId, apenasDisponiveis: true });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/clientes" className="hover:text-foreground">
          Clientes
        </Link>
        <span>/</span>
        <span className="text-foreground">Novo</span>
      </div>

      <div className="rounded-2xl bg-card shadow-card p-5">
        <h1 className="mb-5 text-xl font-bold tracking-tight text-foreground">Novo cliente</h1>
        <PessoaForm modo="criar" perfilPadrao="CLIENTE" camposPersonalizados={campos} acao={criarPessoaAction} />
      </div>
    </div>
  );
}
