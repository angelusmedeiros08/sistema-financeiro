"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { estornarBaixa, cancelarParcela, renegociarParcela } from "./ciclo-vida-parcela";

type ResultadoAcao = { erro: string } | { sucesso: true };

function revalidarPaginasFinanceiras() {
  revalidatePath("/contas-a-receber");
  revalidatePath("/contas-a-pagar");
  revalidatePath("/despesas");
  revalidatePath("/receitas");
  revalidatePath("/painel");
}

export async function estornarBaixaAction(formData: FormData): Promise<ResultadoAcao> {
  const baixaId = String(formData.get("baixa_id") ?? "");
  if (!baixaId) return { erro: "Baixa inválida." };

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await estornarBaixa(supabase, {
    tenant_id: contexto.tenantId,
    baixa_id: baixaId,
    criado_por: contexto.user.id,
  });

  if ("erro" in resultado) return resultado;

  revalidarPaginasFinanceiras();
  return { sucesso: true };
}

export async function cancelarParcelaAction(formData: FormData): Promise<ResultadoAcao> {
  const parcelaId = String(formData.get("parcela_id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!parcelaId || !motivo) return { erro: "Informe o motivo do cancelamento." };

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await cancelarParcela(supabase, {
    tenant_id: contexto.tenantId,
    parcela_id: parcelaId,
    motivo,
  });

  if ("erro" in resultado) return resultado;

  revalidarPaginasFinanceiras();
  return { sucesso: true };
}

// Fatia 5 do dossiê UX (Ações em lote) — mesma cancelarParcela de sempre,
// chamada em sequência pra cada id selecionado; motivo único pra todas.
// Retorna quantas cancelaram e quais falharam (ex.: já tinha baixa
// registrada entre a seleção e o clique) em vez de parar na primeira
// falha, pra não deixar metade da seleção sem tentar.
export async function cancelarParcelasEmLoteAction(
  parcelaIds: string[],
  motivo: string,
): Promise<{ erro: string } | { canceladas: number; falhas: { parcelaId: string; erro: string }[] }> {
  const motivoLimpo = motivo.trim();
  if (parcelaIds.length === 0 || !motivoLimpo) return { erro: "Selecione ao menos uma parcela e informe o motivo do cancelamento." };

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  let canceladas = 0;
  const falhas: { parcelaId: string; erro: string }[] = [];

  for (const parcelaId of parcelaIds) {
    const resultado = await cancelarParcela(supabase, { tenant_id: contexto.tenantId, parcela_id: parcelaId, motivo: motivoLimpo });
    if ("erro" in resultado) falhas.push({ parcelaId, erro: resultado.erro });
    else canceladas++;
  }

  revalidarPaginasFinanceiras();
  return { canceladas, falhas };
}

export async function renegociarParcelaAction(formData: FormData): Promise<ResultadoAcao> {
  const parcelaId = String(formData.get("parcela_id") ?? "");
  const novaData = String(formData.get("nova_data_vencimento") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!parcelaId || !novaData || !motivo) {
    return { erro: "Preencha a nova data de vencimento e o motivo." };
  }

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await renegociarParcela(supabase, {
    tenant_id: contexto.tenantId,
    parcela_id: parcelaId,
    nova_data_vencimento: novaData,
    motivo,
    criado_por: contexto.user.id,
  });

  if ("erro" in resultado) return resultado;

  revalidarPaginasFinanceiras();
  return { sucesso: true };
}
