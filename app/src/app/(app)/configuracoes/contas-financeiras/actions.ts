"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { hojeIsoBrasil } from "@/lib/data-brasil";

type ResultadoAcao = { erro: string } | { sucesso: true };

export async function criarContaFinanceira(formData: FormData): Promise<ResultadoAcao> {
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "BANCO");
  const banco = String(formData.get("banco") ?? "").trim();
  const saldoInicial = Number(formData.get("saldo_inicial") ?? 0);

  if (!nome) {
    return { erro: "Informe o nome da conta." };
  }
  if (!Number.isFinite(saldoInicial)) {
    return { erro: "Saldo inicial inválido." };
  }

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const { error } = await supabase.from("contas_financeiras").insert({
    tenant_id: contexto.tenantId,
    nome,
    tipo,
    banco: banco || null,
    saldo_inicial: saldoInicial,
    saldo_inicial_data: saldoInicial !== 0 ? hojeIsoBrasil() : null,
  });

  if (error) return { erro: error.message };

  revalidatePath("/configuracoes/contas-financeiras");
  return { sucesso: true };
}

export async function alternarAtivoContaFinanceira(contaId: string, ativo: boolean): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contas_financeiras")
    .update({ ativo })
    .eq("id", contaId)
    .eq("tenant_id", contexto.tenantId);

  if (error) return { erro: error.message };

  revalidatePath("/configuracoes/contas-financeiras");
  return { sucesso: true };
}
