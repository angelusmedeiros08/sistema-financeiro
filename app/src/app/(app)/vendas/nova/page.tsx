import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarProdutosServicos } from "@/lib/produtos-servicos/produtos-servicos";
import { VendaForm } from "../venda-form";

export default async function PaginaNovaVenda() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const [pessoasResultado, produtos, formasPagamentoResultado] = await Promise.all([
    supabase.from("pessoas").select("id, nome").eq("tenant_id", contexto.tenantId).contains("perfis", ["CLIENTE"]).order("nome"),
    listarProdutosServicos(supabase, contexto.tenantId, { apenasAtivos: true }),
    supabase.from("formas_pagamento").select("id, nome").eq("tenant_id", contexto.tenantId).order("nome"),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/vendas" className="text-xs text-muted-foreground hover:text-foreground">
          ← Vendas
        </Link>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">Nova venda</h1>
      </div>

      <VendaForm
        modo="criar"
        pessoas={pessoasResultado.data ?? []}
        produtosIniciais={produtos.map((p) => ({ id: p.id, nome: p.nome, precoVenda: p.precoVenda }))}
        formasPagamento={formasPagamentoResultado.data ?? []}
      />
    </div>
  );
}
