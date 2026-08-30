"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import {
  criarOrcamento,
  editarCabecalhoOrcamento,
  enviarOrcamento,
  reenviarOrcamento,
  recusarOrcamento,
  aprovarOrcamento,
  buscarOrcamento,
  validadeSugerida,
  type ItemOrcamentoEntrada,
} from "./orcamentos-comerciais";
import { enviarEmailOrcamento } from "./orcamento-email";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarDataIsoParaBR } from "@/lib/importacao/locale-br";

type ResultadoAcao = { erro: string } | { sucesso: true };
type Cliente = Awaited<ReturnType<typeof createClient>>;

function lerItensJson(formData: FormData): ItemOrcamentoEntrada[] {
  const bruto = String(formData.get("itens_json") ?? "[]");
  try {
    const lista = JSON.parse(bruto);
    if (!Array.isArray(lista)) return [];
    return lista.map((item) => ({
      produtoServicoId: String(item.produtoServicoId ?? ""),
      quantidade: Number(item.quantidade),
      precoUnitario: Number(item.precoUnitario),
    }));
  } catch {
    return [];
  }
}

function lerDadosCabecalho(formData: FormData) {
  return {
    pessoaId: String(formData.get("pessoa_id") ?? ""),
    dataEmissao: String(formData.get("data_emissao") ?? ""),
    formaPagamentoId: String(formData.get("forma_pagamento_id") ?? ""),
    numeroParcelas: Number(formData.get("numero_parcelas") ?? 1),
    primeiroVencimento: String(formData.get("primeiro_vencimento") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  };
}

function revalidarOrcamento(orcamentoId?: string) {
  revalidatePath("/orcamentos");
  if (orcamentoId) revalidatePath(`/orcamentos/${orcamentoId}`);
}

async function enviarEmailDeOrcamento(
  supabase: Cliente,
  params: { tenantId: string; tenantNome: string; orcamentoId: string; atualizado: boolean },
): Promise<void> {
  const orcamento = await buscarOrcamento(supabase, params.tenantId, params.orcamentoId);
  if (!orcamento || !orcamento.pessoaEmail || !orcamento.validade || !orcamento.tokenPublico) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await enviarEmailOrcamento({
    email: orcamento.pessoaEmail,
    clienteNome: orcamento.pessoaNome,
    tenantNome: params.tenantNome,
    numeroOrcamento: orcamento.numero,
    valorFormatado: formatarMoeda(orcamento.valorTotal),
    validadeFormatada: formatarDataIsoParaBR(orcamento.validade),
    link: `${siteUrl}/orcamento/${orcamento.tokenPublico}`,
    atualizado: params.atualizado,
  });
}

export async function criarOrcamentoAction(formData: FormData): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const dados = lerDadosCabecalho(formData);
  const acao = String(formData.get("acao") ?? "rascunho");

  const resultado = await criarOrcamento(supabase, {
    tenantId: contexto.tenantId,
    ...dados,
    itens: lerItensJson(formData),
    criadoPor: contexto.user.id,
  });

  if ("erro" in resultado) return resultado;

  if (acao === "enviar") {
    const validade = String(formData.get("validade") ?? "") || validadeSugerida();
    const resultadoEnvio = await enviarOrcamento(supabase, { tenantId: contexto.tenantId, orcamentoId: resultado.id, validade });
    if ("erro" in resultadoEnvio) return resultadoEnvio;
    await enviarEmailDeOrcamento(supabase, { tenantId: contexto.tenantId, tenantNome: contexto.tenantNome, orcamentoId: resultado.id, atualizado: false });
  }

  revalidarOrcamento(resultado.id);
  redirect(`/orcamentos/${resultado.id}`);
}

export async function editarOrcamentoAction(orcamentoId: string, formData: FormData): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await editarCabecalhoOrcamento(supabase, {
    tenantId: contexto.tenantId,
    orcamentoId,
    ...lerDadosCabecalho(formData),
    itens: lerItensJson(formData),
  });

  if ("erro" in resultado) return resultado;

  if (resultado.validadeResetada) {
    await enviarEmailDeOrcamento(supabase, { tenantId: contexto.tenantId, tenantNome: contexto.tenantNome, orcamentoId, atualizado: true });
  }

  revalidarOrcamento(orcamentoId);
  return { sucesso: true };
}

export async function enviarOrcamentoAction(orcamentoId: string, validade: string): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await enviarOrcamento(supabase, { tenantId: contexto.tenantId, orcamentoId, validade: validade || validadeSugerida() });
  if ("erro" in resultado) return resultado;

  await enviarEmailDeOrcamento(supabase, { tenantId: contexto.tenantId, tenantNome: contexto.tenantNome, orcamentoId, atualizado: false });
  revalidarOrcamento(orcamentoId);
  return { sucesso: true };
}

export async function reenviarOrcamentoAction(orcamentoId: string, validade: string): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await reenviarOrcamento(supabase, { tenantId: contexto.tenantId, orcamentoId, validade: validade || validadeSugerida() });
  if ("erro" in resultado) return resultado;

  await enviarEmailDeOrcamento(supabase, { tenantId: contexto.tenantId, tenantNome: contexto.tenantNome, orcamentoId, atualizado: true });
  revalidarOrcamento(orcamentoId);
  return { sucesso: true };
}

// Aprovar/recusar manualmente — staff registrando uma decisão que o cliente
// deu por outro canal (telefone, WhatsApp), mesmo efeito de quando ele
// decide pelo link público.
export async function aprovarOrcamentoManualAction(orcamentoId: string): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await aprovarOrcamento(supabase, { tenantId: contexto.tenantId, orcamentoId, criadoPor: contexto.user.id });
  if ("erro" in resultado) return resultado;
  revalidarOrcamento(orcamentoId);
  revalidatePath("/vendas");
  revalidatePath("/contas-a-receber");
  return { sucesso: true };
}

export async function recusarOrcamentoManualAction(orcamentoId: string, motivo?: string): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await recusarOrcamento(supabase, { tenantId: contexto.tenantId, orcamentoId, motivoRecusa: motivo });
  if ("erro" in resultado) return resultado;
  revalidarOrcamento(orcamentoId);
  return { sucesso: true };
}
