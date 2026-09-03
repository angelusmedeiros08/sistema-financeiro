import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { TabelaEventos } from "@/components/lancamentos/tabela-eventos";
import { TituloPagina } from "@/components/layout/titulo-pagina";

// Histórico combinado (receita + despesa) — sem formulário de criação
// acima, diferente das páginas /despesas e /receitas do app interno.
export default async function PaginaPortalLancamentos() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  let query = supabase
    .from("eventos_financeiros")
    .select(
      "id, descricao, valor_total, tipo, data_competencia, parcelas(status, data_vencimento), rateio_categoria(categorias_financeiras(nome))",
    )
    .eq("tenant_id", contexto.tenantId)
    .order("data_competencia", { ascending: false });

  if (contexto.pessoaId) query = query.eq("pessoa_id", contexto.pessoaId);

  const { data: eventos } = await query;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <TituloPagina>Lançamentos</TituloPagina>
      <TabelaEventos eventos={eventos ?? []} textoVazio="Nenhum lançamento ainda." />
    </div>
  );
}
