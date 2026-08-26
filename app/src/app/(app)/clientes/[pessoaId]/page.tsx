import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarDadosPessoa, listarCamposPersonalizados, listarLancamentosPessoa } from "@/lib/pessoas/buscar-pessoa";
import { DetalhePessoa } from "@/components/pessoas/detalhe-pessoa";

export default async function PaginaDetalheCliente({
  params,
  searchParams,
}: {
  params: Promise<{ pessoaId: string }>;
  searchParams: Promise<{ voltar?: string }>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { pessoaId } = await params;
  const { voltar } = await searchParams;
  const supabase = await createClient();

  const [pessoa, camposPersonalizados, lancamentos] = await Promise.all([
    buscarDadosPessoa(supabase, { tenant_id: contexto.tenantId, pessoa_id: pessoaId }),
    listarCamposPersonalizados(supabase, { tenant_id: contexto.tenantId, apenasDisponiveis: true }),
    listarLancamentosPessoa(supabase, { tenant_id: contexto.tenantId, pessoa_id: pessoaId }),
  ]);

  if (!pessoa) notFound();

  return (
    <DetalhePessoa pessoa={pessoa} camposPersonalizados={camposPersonalizados} lancamentos={lancamentos} caminhoBase="clientes" voltar={voltar} />
  );
}
