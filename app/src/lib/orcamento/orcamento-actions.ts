"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { definirValorOrcamento, copiarValorParaRestoDoAno } from "./orcamento";

type ResultadoAcao = { erro: string } | { sucesso: true };

export async function definirValorOrcamentoAction(params: {
  categoriaId: string;
  ano: number;
  mes: number;
  valorPrevisto: number;
}): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await definirValorOrcamento(supabase, {
    tenantId: contexto.tenantId,
    categoriaId: params.categoriaId,
    ano: params.ano,
    mes: params.mes,
    valorPrevisto: params.valorPrevisto,
    criadoPor: contexto.user.id,
  });

  if ("erro" in resultado) return resultado;
  revalidatePath("/configuracoes/orcamento");
  revalidatePath("/relatorios/orcado-realizado");
  return { sucesso: true };
}

export async function copiarValorParaRestoDoAnoAction(params: {
  categoriaId: string;
  ano: number;
  mesOrigem: number;
  valorPrevisto: number;
}): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await copiarValorParaRestoDoAno(supabase, {
    tenantId: contexto.tenantId,
    categoriaId: params.categoriaId,
    ano: params.ano,
    mesOrigem: params.mesOrigem,
    valorPrevisto: params.valorPrevisto,
    criadoPor: contexto.user.id,
  });

  if ("erro" in resultado) return resultado;
  revalidatePath("/configuracoes/orcamento");
  revalidatePath("/relatorios/orcado-realizado");
  return { sucesso: true };
}
