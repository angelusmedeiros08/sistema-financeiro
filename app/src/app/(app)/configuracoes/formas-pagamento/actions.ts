"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";

type ResultadoAcao = { erro: string } | { sucesso: true };

export async function criarFormaPagamento(formData: FormData): Promise<ResultadoAcao> {
  const nome = String(formData.get("nome") ?? "").trim();

  if (!nome) {
    return { erro: "Informe o nome da forma de pagamento." };
  }

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const { error } = await supabase.from("formas_pagamento").insert({
    tenant_id: contexto.tenantId,
    nome,
  });

  if (error) return { erro: error.message };

  revalidatePath("/configuracoes/formas-pagamento");
  return { sucesso: true };
}

export async function alternarAtivoFormaPagamento(formaPagamentoId: string, ativo: boolean): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const { error } = await supabase
    .from("formas_pagamento")
    .update({ ativo })
    .eq("id", formaPagamentoId)
    .eq("tenant_id", contexto.tenantId);

  if (error) return { erro: error.message };

  revalidatePath("/configuracoes/formas-pagamento");
  return { sucesso: true };
}
