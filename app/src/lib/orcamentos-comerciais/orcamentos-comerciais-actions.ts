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
} from "./orcamentos-comerciais";
import { enviarEmailOrcamento } from "./orcamento-email";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarDataIsoParaBR } from "@/lib/importacao/locale-br";
import { lerItensComerciaisJson, lerCabecalhoComercial, revalidarDocumentoComercial } from "@/lib/comercial/formulario-actions";

type ResultadoAcao = { erro: string } | { sucesso: true };
type Cliente = Awaited<ReturnType<typeof createClient>>;

function revalidarOrcamento(orcamentoId?: string) {
  revalidarDocumentoComercial("/orcamentos", orcamentoId);
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
  const dados = lerCabecalhoComercial(formData);
  const acao = String(formData.get("acao") ?? "rascunho");

  const resultado = await criarOrcamento(supabase, {
    tenantId: contexto.tenantId,
    ...dados,
    itens: lerItensComerciaisJson(formData),
    criadoPor: contexto.user.id,
    importKey: String(formData.get("import_key") ?? "") || undefined,
  });

  if ("erro" in resultado) return resultado;

  if (acao === "enviar") {
    // OrcamentoForm não tem campo de validade (diferente do form antigo de
    // Vendas que este módulo substituiu) — a validade é sempre sugerida
    // automaticamente, sem escolha manual no "Salvar e enviar" (achado em
    // auditoria: `formData.get("validade")` era código morto, nunca havia
    // um input com esse name).
    const validade = validadeSugerida();
    const resultadoEnvio = await enviarOrcamento(supabase, { tenantId: contexto.tenantId, orcamentoId: resultado.id, validade });
    if ("erro" in resultadoEnvio) {
      // Achado em auditoria: `criarOrcamento` acima já persistiu o registro
      // (em RASCUNHO) — retornar erro aqui deixava o formulário de criação
      // sem nenhum id, e um segundo clique em "Salvar e enviar" criava um
      // SEGUNDO orçamento em vez de reaproveitar o primeiro (ex.: cliente
      // sem e-mail cadastrado — staff cadastra o e-mail e tenta de novo).
      // Redireciona pro editor do orçamento já criado, com o erro na URL —
      // dali em diante qualquer novo envio é editarOrcamentoAction (edita),
      // nunca cria outro.
      revalidarOrcamento(resultado.id);
      redirect(`/orcamentos/${resultado.id}?erro=${encodeURIComponent(resultadoEnvio.erro)}`);
    }
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
    ...lerCabecalhoComercial(formData),
    itens: lerItensComerciaisJson(formData),
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
