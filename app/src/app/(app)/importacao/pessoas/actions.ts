"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { commitarLinhaPessoa, type ParametrosCommitLinhaPessoa } from "@/lib/pessoas/importacao/commit";
import { iniciarImportacao, atualizarItemImportacao, finalizarImportacao } from "@/lib/importacoes/importacoes";
import type { Json } from "@/utils/supabase/database.types";

export type ParametrosImportarLinhaPessoa = Omit<ParametrosCommitLinhaPessoa, "tenant_id">;

// Registra o lote inteiro (um item "pendente" por linha) antes de qualquer
// commit rodar — dá rastro persistido ao progresso desde o início, não só
// depois que a primeira linha termina.
export async function iniciarImportacaoPessoasAction(
  nomeArquivo: string,
  linhas: (ParametrosImportarLinhaPessoa & { linhaNumero: number })[],
): Promise<{ importacao_id: string; itensPorLinha: Record<number, string> } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await iniciarImportacao(supabase, {
    tenant_id: contexto.tenantId,
    tipo: "pessoas",
    nome_arquivo: nomeArquivo,
    criado_por: contexto.user.id,
    itens: linhas.map((l) => ({ linha_numero: l.linhaNumero, acao: l.acao, dados_normalizados: l as unknown as Json })),
  });

  if ("erro" in resultado) return resultado;

  const itensPorLinha: Record<number, string> = {};
  for (const item of resultado.itens) itensPorLinha[item.linha_numero] = item.item_id;
  return { importacao_id: resultado.importacao_id, itensPorLinha };
}

export async function importarLinhaPessoaAction(
  itemId: string,
  params: ParametrosImportarLinhaPessoa,
): Promise<{ pessoa_id: string } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await commitarLinhaPessoa(supabase, { ...params, tenant_id: contexto.tenantId });

  await atualizarItemImportacao(supabase, {
    item_id: itemId,
    status: "erro" in resultado ? "erro" : "sucesso",
    pessoa_id: "erro" in resultado ? null : resultado.pessoa_id,
    erro: "erro" in resultado ? resultado.erro : null,
  });

  return resultado;
}

export async function finalizarImportacaoPessoasAction(importacaoId: string, status: "concluida" | "cancelada"): Promise<{ sucesso: true } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  return finalizarImportacao(supabase, { importacao_id: importacaoId, status });
}

export async function revalidarPosImportacaoPessoasAction(): Promise<void> {
  revalidatePath("/clientes");
  revalidatePath("/fornecedores");
}
