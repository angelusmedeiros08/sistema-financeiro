"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { anexarDocumento, obterUrlAnexo } from "./anexos";
import type { Database } from "@/utils/supabase/database.types";

type ResultadoAcao = { erro: string } | { sucesso: true };
type FormaAnexo = Database["public"]["Enums"]["forma_anexo"];
type TipoAnexo = Database["public"]["Enums"]["tipo_anexo"];

export async function anexarDocumentoAction(formData: FormData): Promise<ResultadoAcao> {
  const eventoFinanceiroId = String(formData.get("evento_financeiro_id") ?? "") || undefined;
  const baixaId = String(formData.get("baixa_id") ?? "") || undefined;
  const regraRecorrenciaId = String(formData.get("regra_recorrencia_id") ?? "") || undefined;
  const forma = String(formData.get("forma") ?? "ARQUIVO") as FormaAnexo;
  const tipo = String(formData.get("tipo") ?? "OUTROS") as TipoAnexo;
  const descricao = String(formData.get("descricao") ?? "") || undefined;
  const url = String(formData.get("url") ?? "") || undefined;
  const arquivo = formData.get("arquivo");
  const caminhoPagina = String(formData.get("caminho_pagina") ?? "");

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await anexarDocumento(supabase, {
    tenant_id: contexto.tenantId,
    evento_financeiro_id: eventoFinanceiroId,
    baixa_id: baixaId,
    regra_recorrencia_id: regraRecorrenciaId,
    forma,
    tipo,
    descricao,
    arquivo: arquivo instanceof File ? arquivo : undefined,
    url,
    criado_por: contexto.user.id,
  });

  if ("erro" in resultado) return resultado;

  if (caminhoPagina) revalidatePath(caminhoPagina);
  revalidatePath("/despesas");
  revalidatePath("/receitas");
  return { sucesso: true };
}

export async function obterUrlAnexoAction(anexoId: string): Promise<{ url: string } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  return obterUrlAnexo(supabase, { tenant_id: contexto.tenantId, anexo_id: anexoId });
}
