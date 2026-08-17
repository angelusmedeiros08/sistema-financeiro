"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import type { Database } from "@/utils/supabase/database.types";
import { criarProdutoServico, editarProdutoServico, criarProdutoServicoRapido } from "./produtos-servicos";

type TipoProdutoServico = Database["public"]["Enums"]["tipo_produto_servico"];
type ResultadoAcao = { erro: string } | { sucesso: true };

function lerNumero(formData: FormData, campo: string): number {
  return Number(String(formData.get(campo) ?? "0").replace(",", "."));
}

export async function criarProdutoServicoAction(formData: FormData): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await criarProdutoServico(supabase, {
    tenantId: contexto.tenantId,
    nome: String(formData.get("nome") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    tipo: String(formData.get("tipo") ?? "SERVICO") as TipoProdutoServico,
    precoVenda: lerNumero(formData, "preco_venda"),
    categoriaFinanceiraId: String(formData.get("categoria_financeira_id") ?? ""),
    unidadeMedida: String(formData.get("unidade_medida") ?? ""),
    codigoReferencia: String(formData.get("codigo_referencia") ?? ""),
  });

  if ("erro" in resultado) return resultado;
  revalidatePath("/produtos-servicos");
  return { sucesso: true };
}

export async function editarProdutoServicoAction(produtoServicoId: string, formData: FormData): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await editarProdutoServico(supabase, {
    tenantId: contexto.tenantId,
    produtoServicoId,
    nome: String(formData.get("nome") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    tipo: String(formData.get("tipo") ?? "SERVICO") as TipoProdutoServico,
    precoVenda: lerNumero(formData, "preco_venda"),
    categoriaFinanceiraId: String(formData.get("categoria_financeira_id") ?? ""),
    unidadeMedida: String(formData.get("unidade_medida") ?? ""),
    codigoReferencia: String(formData.get("codigo_referencia") ?? ""),
    ativo: formData.get("ativo") === "on",
  });

  if ("erro" in resultado) return resultado;
  revalidatePath("/produtos-servicos");
  return { sucesso: true };
}

export async function criarProdutoServicoRapidoAction(nome: string): Promise<{ id: string; precoVenda: number } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await criarProdutoServicoRapido(supabase, { tenantId: contexto.tenantId, nome });
  if ("erro" in resultado) return resultado;
  revalidatePath("/produtos-servicos");
  return resultado;
}
