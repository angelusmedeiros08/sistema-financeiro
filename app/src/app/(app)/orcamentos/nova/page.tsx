import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarProdutosServicos } from "@/lib/produtos-servicos/produtos-servicos";
import { listarPessoasParaCombobox } from "@/lib/pessoas/buscar-pessoa";
import { OrcamentoForm } from "../orcamento-form";

export default async function PaginaNovoOrcamento() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const [pessoas, produtos, formasPagamentoResultado] = await Promise.all([
    listarPessoasParaCombobox(supabase, { tenant_id: contexto.tenantId, perfil: "CLIENTE" }),
    listarProdutosServicos(supabase, contexto.tenantId, { apenasAtivos: true }),
    supabase.from("formas_pagamento").select("id, nome").eq("tenant_id", contexto.tenantId).order("nome"),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/orcamentos" className="text-xs text-muted-foreground hover:text-foreground">
          ← Orçamentos
        </Link>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">Novo orçamento</h1>
      </div>

      <OrcamentoForm
        modo="criar"
        pessoas={pessoas}
        produtosIniciais={produtos.map((p) => ({ id: p.id, nome: p.nome, precoVenda: p.precoVenda }))}
        formasPagamento={formasPagamentoResultado.data ?? []}
      />
    </div>
  );
}
