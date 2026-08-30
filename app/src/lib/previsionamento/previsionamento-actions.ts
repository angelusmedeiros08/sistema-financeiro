"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { definirValorPrevisionamento, copiarValorParaRestoDoAno } from "./previsionamento";

type ResultadoAcao = { erro: string } | { sucesso: true };

export async function definirValorPrevisionamentoAction(params: {
  categoriaId: string;
  ano: number;
  mes: number;
  valorPrevisto: number;
}): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await definirValorPrevisionamento(supabase, {
    tenantId: contexto.tenantId,
    categoriaId: params.categoriaId,
    ano: params.ano,
    mes: params.mes,
    valorPrevisto: params.valorPrevisto,
    criadoPor: contexto.user.id,
  });

  if ("erro" in resultado) return resultado;
  revalidatePath("/previsionamento");
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
  revalidatePath("/previsionamento");
  return { sucesso: true };
}
