"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { criarContaContabil, editarContaContabil } from "./plano-contas";
import type { Database } from "@/utils/supabase/database.types";

type ResultadoAcao = { erro: string } | { sucesso: true };
type TipoContaContabil = Database["public"]["Enums"]["tipo_conta_contabil"];
type NaturezaConta = Database["public"]["Enums"]["natureza_conta"];

export async function criarContaContabilAction(formData: FormData): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await criarContaContabil(supabase, {
    tenantId: contexto.tenantId,
    codigo: String(formData.get("codigo") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    tipo: String(formData.get("tipo") ?? "") as TipoContaContabil,
    natureza: String(formData.get("natureza") ?? "") as NaturezaConta,
    contaPaiId: String(formData.get("conta_pai_id") ?? "") || null,
    codigoReferencialSped: String(formData.get("codigo_referencial_sped") ?? "") || null,
  });

  if ("erro" in resultado) return resultado;
  revalidatePath("/configuracoes/plano-de-contas");
  return { sucesso: true };
}

export async function editarContaContabilAction(formData: FormData): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await editarContaContabil(supabase, {
    tenantId: contexto.tenantId,
    contaId: String(formData.get("conta_id") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    tipo: String(formData.get("tipo") ?? "") as TipoContaContabil,
    natureza: String(formData.get("natureza") ?? "") as NaturezaConta,
    contaPaiId: String(formData.get("conta_pai_id") ?? "") || null,
    codigoReferencialSped: String(formData.get("codigo_referencial_sped") ?? "") || null,
  });

  if ("erro" in resultado) return resultado;
  revalidatePath("/configuracoes/plano-de-contas");
  return { sucesso: true };
}
