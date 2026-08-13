import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarDadosParcela } from "@/lib/contabil/buscar-parcela";
import { DetalheParcela } from "@/components/lancamentos/detalhe-parcela";

export default async function PaginaDetalheContaAReceber({
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

  return <DetalheParcela parcela={parcela} caminhoBase="contas-a-receber" rotuloAcaoBaixa="Dar baixa" />;
}
