"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { criarVenda, editarCabecalhoVenda, recusarVenda, aprovarVenda } from "./vendas";
import { lerItensComerciaisJson, lerCabecalhoComercial, revalidarDocumentoComercial } from "@/lib/comercial/formulario-actions";

type ResultadoAcao = { erro: string } | { sucesso: true };

function revalidarVenda(vendaId?: string) {
  revalidarDocumentoComercial("/vendas", vendaId);
}

// `acao`: "rascunho" salva e fica em RASCUNHO; "direto" salva e aprova na
// mesma chamada. Não existe mais um "enviar como orçamento" aqui — quem
// precisa que o cliente decida usa o módulo Orçamento, que gera a venda só
// quando aprovado.
export async function criarVendaAction(formData: FormData): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const dados = lerCabecalhoComercial(formData);
  const acao = String(formData.get("acao") ?? "rascunho");

  const resultado = await criarVenda(supabase, {
    tenantId: contexto.tenantId,
    ...dados,
    itens: lerItensComerciaisJson(formData),
    criadoPor: contexto.user.id,
    direto: acao === "direto",
  });

  if ("erro" in resultado) return resultado;

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
    ...lerCabecalhoComercial(formData),
    itens: lerItensComerciaisJson(formData),
  });

  if ("erro" in resultado) return resultado;
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
