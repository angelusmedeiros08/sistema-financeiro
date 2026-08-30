"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import {
  criarVenda,
  editarCabecalhoVenda,
  enviarOrcamento,
  reenviarOrcamento,
  recusarVenda,
  aprovarVenda,
  buscarVenda,
  validadeSugerida,
  type ItemVendaEntrada,
} from "./vendas";
import { enviarEmailOrcamento } from "./orcamento-email";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarDataIsoParaBR } from "@/lib/importacao/locale-br";

type ResultadoAcao = { erro: string } | { sucesso: true };
type Cliente = Awaited<ReturnType<typeof createClient>>;

function lerItensJson(formData: FormData): ItemVendaEntrada[] {
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

function revalidarVenda(vendaId?: string) {
  revalidatePath("/vendas");
  if (vendaId) revalidatePath(`/vendas/${vendaId}`);
}

// Busca a venda já enviada/atualizada e dispara o e-mail — best-effort, não
// desfaz o envio/edição se o SMTP falhar (mesmo princípio de todo disparo de
// e-mail já existente no projeto: o dado de negócio já foi gravado antes
// desta chamada). Compartilhado pelos 3 pontos que podem gerar essa
// notificação: criar já como orçamento, enviar um rascunho existente, e
// editar um orçamento já enviado.
async function enviarEmailDeOrcamento(
  supabase: Cliente,
  params: { tenantId: string; tenantNome: string; vendaId: string; atualizado: boolean },
): Promise<void> {
  const venda = await buscarVenda(supabase, params.tenantId, params.vendaId);
  if (!venda || !venda.pessoaEmail || !venda.validade || !venda.tokenPublico) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await enviarEmailOrcamento({
    email: venda.pessoaEmail,
    clienteNome: venda.pessoaNome,
    tenantNome: params.tenantNome,
    numeroVenda: venda.numero,
    valorFormatado: formatarMoeda(venda.valorTotal),
    validadeFormatada: formatarDataIsoParaBR(venda.validade),
    link: `${siteUrl}/orcamento/${venda.tokenPublico}`,
    atualizado: params.atualizado,
  });
}

// `acao`: "rascunho" salva e fica em RASCUNHO; "orcamento" salva e já envia
// (ENVIADO); "direto" salva e aprova na mesma chamada (venda direta do spec).
export async function criarVendaAction(formData: FormData): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const dados = lerDadosCabecalho(formData);
  const acao = String(formData.get("acao") ?? "rascunho");

  const resultado = await criarVenda(supabase, {
    tenantId: contexto.tenantId,
    ...dados,
    itens: lerItensJson(formData),
    criadoPor: contexto.user.id,
    direto: acao === "direto",
  });

  if ("erro" in resultado) return resultado;

  if (acao === "orcamento") {
    const validade = String(formData.get("validade") ?? "") || validadeSugerida();
    const resultadoEnvio = await enviarOrcamento(supabase, { tenantId: contexto.tenantId, vendaId: resultado.id, validade });
    if ("erro" in resultadoEnvio) return resultadoEnvio;
    await enviarEmailDeOrcamento(supabase, { tenantId: contexto.tenantId, tenantNome: contexto.tenantNome, vendaId: resultado.id, atualizado: false });
  }

  revalidarVenda(resultado.id);
  redirect(`/vendas/${resultado.id}`);
}

export async function editarVendaAction(vendaId: string, formData: FormData): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await editarCabecalhoVenda(supabase, {
    tenantId: contexto.tenantId,
    vendaId,
    ...lerDadosCabecalho(formData),
    itens: lerItensJson(formData),
  });

  if ("erro" in resultado) return resultado;

  if (resultado.validadeResetada) {
    await enviarEmailDeOrcamento(supabase, { tenantId: contexto.tenantId, tenantNome: contexto.tenantNome, vendaId, atualizado: true });
  }

  revalidarVenda(vendaId);
  return { sucesso: true };
}

export async function enviarOrcamentoAction(vendaId: string, validade: string): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await enviarOrcamento(supabase, { tenantId: contexto.tenantId, vendaId, validade: validade || validadeSugerida() });
  if ("erro" in resultado) return resultado;

  await enviarEmailDeOrcamento(supabase, { tenantId: contexto.tenantId, tenantNome: contexto.tenantNome, vendaId, atualizado: false });

  revalidarVenda(vendaId);
  return { sucesso: true };
}

export async function reenviarOrcamentoAction(vendaId: string, validade: string): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await reenviarOrcamento(supabase, { tenantId: contexto.tenantId, vendaId, validade: validade || validadeSugerida() });
  if ("erro" in resultado) return resultado;

  await enviarEmailDeOrcamento(supabase, { tenantId: contexto.tenantId, tenantNome: contexto.tenantNome, vendaId, atualizado: true });

  revalidarVenda(vendaId);
  return { sucesso: true };
}

export async function aprovarVendaAction(vendaId: string): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await aprovarVenda(supabase, { tenantId: contexto.tenantId, vendaId, criadoPor: contexto.user.id });
  if ("erro" in resultado) return resultado;
  revalidarVenda(vendaId);
  revalidatePath("/contas-a-receber");
  return { sucesso: true };
}

export async function recusarVendaAction(vendaId: string): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await recusarVenda(supabase, { tenantId: contexto.tenantId, vendaId });
  if ("erro" in resultado) return resultado;
  revalidarVenda(vendaId);
  return { sucesso: true };
}
