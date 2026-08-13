import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarDadosPessoa, listarCamposPersonalizados, listarLancamentosPessoa } from "@/lib/pessoas/buscar-pessoa";
import { DetalhePessoa } from "@/components/pessoas/detalhe-pessoa";

export default async function PaginaDetalheFornecedor({
  params,
}: {
  params: Promise<{ pessoaId: string }>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { pessoaId } = await params;
  const supabase = await createClient();

  const [pessoa, camposPersonalizados, lancamentos] = await Promise.all([
    buscarDadosPessoa(supabase, { tenant_id: contexto.tenantId, pessoa_id: pessoaId }),
    listarCamposPersonalizados(supabase, { tenant_id: contexto.tenantId, apenasDisponiveis: true }),
    listarLancamentosPessoa(supabase, { tenant_id: contexto.tenantId, pessoa_id: pessoaId }),
  ]);

  if (!pessoa) notFound();

  return (
    <DetalhePessoa pessoa={pessoa} camposPersonalizados={camposPersonalizados} lancamentos={lancamentos} caminhoBase="fornecedores" />
  );
}
