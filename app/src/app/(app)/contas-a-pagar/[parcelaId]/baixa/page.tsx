import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarDadosParcela } from "@/lib/contabil/buscar-parcela";
import { FormularioBaixa } from "@/components/lancamentos/formulario-baixa";

export default async function PaginaBaixaContaAPagar({
  params,
}: {
  params: Promise<{ parcelaId: string }>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");
  const { tenantId } = contexto;

  const { parcelaId } = await params;
  const supabase = await createClient();

  const [parcela, { data: contasFinanceiras }] = await Promise.all([
    buscarDadosParcela(supabase, { tenant_id: tenantId, parcela_id: parcelaId, tipo: "DESPESA" }),
    supabase.from("contas_financeiras").select("id, nome").eq("tenant_id", tenantId).eq("ativo", true).order("nome"),
  ]);

  if (!parcela) notFound();

  const somaPaga = parcela.baixas.filter((b) => !b.estornado_em).reduce((acc, b) => acc + b.valor_pago, 0);
  const saldoResidual = parcela.valor - somaPaga;

  return (
    <FormularioBaixa
      parcelaId={parcela.id}
      descricao={parcela.descricao}
      saldoResidual={saldoResidual}
      contasFinanceiras={contasFinanceiras ?? []}
      rotuloAcao="Dar baixa"
      caminhoVoltar={`/contas-a-pagar/${parcela.id}`}
    />
  );
}
