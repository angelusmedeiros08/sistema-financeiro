import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarLinhasParaConciliarAction } from "./actions";
import { WizardConciliacao } from "./wizard";

export default async function PaginaConciliarConta({ params }: { params: Promise<{ id: string }> }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { id: contaFinanceiraId } = await params;
  const supabase = await createClient();

  const [{ data: conta }, { data: categorias }, { data: pessoas }, linhasIniciais] = await Promise.all([
    supabase.from("contas_financeiras").select("id, nome, tipo").eq("id", contaFinanceiraId).eq("tenant_id", contexto.tenantId).maybeSingle(),
    supabase.from("categorias_financeiras").select("id, nome, tipo").eq("tenant_id", contexto.tenantId).order("nome"),
    supabase.from("pessoas").select("id, nome").eq("tenant_id", contexto.tenantId).order("nome"),
    buscarLinhasParaConciliarAction(contaFinanceiraId),
  ]);

  if (!conta) notFound();
  if ("erro" in linhasIniciais) throw new Error(linhasIniciais.erro);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/configuracoes/contas-financeiras" className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} />
        Contas financeiras
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Conciliar {conta.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Importe o extrato do banco e bata contra o que já está lançado.</p>
      </div>

      <WizardConciliacao
        contaFinanceiraId={conta.id}
        linhasIniciais={linhasIniciais}
        categorias={categorias ?? []}
        pessoas={pessoas ?? []}
      />
    </div>
  );
}
