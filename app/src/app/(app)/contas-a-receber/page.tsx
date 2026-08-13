import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { TabelaParcelasAbertas } from "@/components/lancamentos/tabela-parcelas-abertas";

export default async function PaginaContasAReceber() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) {
    redirect("/entrar");
  }
  const { tenantId } = contexto;

  const supabase = await createClient();

  const [{ data: parcelas }, { data: contasFinanceiras }] = await Promise.all([
    supabase
      .from("parcelas")
      .select("id, valor, data_vencimento, status, baixas(valor_pago), eventos_financeiros!inner(descricao, tipo, pessoas(nome))")
      .eq("tenant_id", tenantId)
      .eq("eventos_financeiros.tipo", "RECEITA")
      .in("status", ["PENDENTE", "RECEBIDO_PARCIAL"])
      .order("data_vencimento", { ascending: true }),
    supabase.from("contas_financeiras").select("id, nome").eq("tenant_id", tenantId).eq("ativo", true).order("nome"),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Contas a receber</h1>
      <TabelaParcelasAbertas
        parcelas={parcelas ?? []}
        contasFinanceiras={contasFinanceiras ?? []}
        textoVazio="Nenhuma conta a receber em aberto."
        rotuloAcaoBaixa="Dar baixa"
      />
    </div>
  );
}
