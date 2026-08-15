"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import type { Database } from "@/utils/supabase/database.types";
import {
  criarLinhaDre,
  editarIdDfcLinhaDre,
  removerLinhaDre,
  reordenarLinhasDre,
  vincularCategoriaDre,
  desvincularCategoriaDre,
  aplicarModeloCompletoDre,
} from "./dre";
import type { IdDfcLinhaDre } from "./dre";

type ResultadoAcao = { erro: string } | { sucesso: true };
type TipoLinhaDre = Database["public"]["Enums"]["tipo_linha_dre"];

function revalidarDre() {
  revalidatePath("/relatorios");
  revalidatePath("/relatorios/dfc");
  revalidatePath("/configuracoes/estrutura-dre");
}

export async function criarLinhaDreAction(formData: FormData): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const idDfcTexto = String(formData.get("id_dfc") ?? "");

  const supabase = await createClient();
  const resultado = await criarLinhaDre(supabase, {
    tenantId: contexto.tenantId,
    rotulo: String(formData.get("rotulo") ?? ""),
    tipoCalc: String(formData.get("tipo_calc") ?? "FOLHA") as TipoLinhaDre,
    idDfc: idDfcTexto ? (idDfcTexto as IdDfcLinhaDre) : null,
  });

  if ("erro" in resultado) return resultado;
  revalidarDre();
  return { sucesso: true };
}

export async function editarIdDfcLinhaDreAction(formData: FormData): Promise<ResultadoAcao> {
  const linhaId = String(formData.get("linha_id") ?? "");
  if (!linhaId) return { erro: "Linha inválida." };

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const idDfcTexto = String(formData.get("id_dfc") ?? "");

  const supabase = await createClient();
  const resultado = await editarIdDfcLinhaDre(supabase, {
    tenantId: contexto.tenantId,
    linhaId,
    idDfc: idDfcTexto ? (idDfcTexto as IdDfcLinhaDre) : null,
  });

  if ("erro" in resultado) return resultado;
  revalidarDre();
  return { sucesso: true };
}

export async function removerLinhaDreAction(formData: FormData): Promise<ResultadoAcao> {
  const linhaId = String(formData.get("linha_id") ?? "");
  if (!linhaId) return { erro: "Linha inválida." };

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await removerLinhaDre(supabase, { tenantId: contexto.tenantId, linhaId });

  if ("erro" in resultado) return resultado;
  revalidarDre();
  return { sucesso: true };
}

export async function reordenarLinhasDreAction(linhaIdsEmOrdem: string[]): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await reordenarLinhasDre(supabase, { tenantId: contexto.tenantId, linhaIdsEmOrdem });

  if ("erro" in resultado) return resultado;
  revalidarDre();
  return { sucesso: true };
}

export async function vincularCategoriaDreAction(formData: FormData): Promise<ResultadoAcao> {
  const linhaId = String(formData.get("linha_id") ?? "");
  const categoriaId = String(formData.get("categoria_id") ?? "");
  if (!linhaId || !categoriaId) return { erro: "Selecione a linha e a categoria." };

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await vincularCategoriaDre(supabase, { tenantId: contexto.tenantId, linhaId, categoriaId });

  if ("erro" in resultado) return resultado;
  revalidarDre();
  return { sucesso: true };
}

export async function desvincularCategoriaDreAction(formData: FormData): Promise<ResultadoAcao> {
  const linhaId = String(formData.get("linha_id") ?? "");
  const categoriaId = String(formData.get("categoria_id") ?? "");
  if (!linhaId || !categoriaId) return { erro: "Vínculo inválido." };

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await desvincularCategoriaDre(supabase, { tenantId: contexto.tenantId, linhaId, categoriaId });

  if ("erro" in resultado) return resultado;
  revalidarDre();
  return { sucesso: true };
}

export async function aplicarModeloCompletoDreAction(): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await aplicarModeloCompletoDre(supabase, { tenantId: contexto.tenantId });

  if ("erro" in resultado) return resultado;
  revalidarDre();
  return { sucesso: true };
}
