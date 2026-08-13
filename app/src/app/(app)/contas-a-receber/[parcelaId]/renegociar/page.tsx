import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarDadosParcela } from "@/lib/contabil/buscar-parcela";
import { FormularioRenegociar } from "@/components/lancamentos/formulario-renegociar";

export default async function PaginaRenegociarContaAReceber({
  params,
}: {
  params: Promise<{ parcelaId: string }>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { parcelaId } = await params;
  const supabase = await createClient();
  const parcela = await buscarDadosParcela(supabase, {
    tenant_id: contexto.tenantId,
    parcela_id: parcelaId,
    tipo: "RECEITA",
  });

  if (!parcela) notFound();

  return (
    <FormularioRenegociar
      parcelaId={parcela.id}
      descricao={parcela.descricao}
      valor={parcela.valor}
      dataVencimentoAtual={parcela.data_vencimento}
      caminhoVoltar={`/contas-a-receber/${parcela.id}`}
    />
  );
}
