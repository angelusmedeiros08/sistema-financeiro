"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import {
  buscarItensParaRetomar,
  marcarImportacaoRetomando,
  desfazerImportacao,
  type ItemImportacao,
} from "@/lib/importacoes/importacoes";
import { importarLinhaPessoaAction, finalizarImportacaoPessoasAction } from "../pessoas/actions";
import type { ParametrosImportarLinhaPessoa } from "../pessoas/actions";

export async function prepararRetomadaAction(importacaoId: string): Promise<{ itens: ItemImportacao[] } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const itens = await buscarItensParaRetomar(supabase, { tenant_id: contexto.tenantId, importacao_id: importacaoId });
  if (itens.length === 0) return { erro: "Não há linhas pendentes ou com erro pra retomar." };

  await marcarImportacaoRetomando(supabase, { importacao_id: importacaoId });
  return { itens };
}

// Reaproveita a mesma action de commit por linha usada no assistente
// original — o item já existe (criado quando o lote nasceu), só falta
// commitar de novo. dados_normalizados foi salvo com o mesmo formato de
// ParametrosImportarLinhaPessoa, então dá pra repassar direto.
export async function retomarItemAction(itemId: string, dados: unknown): Promise<{ pessoa_id: string } | { erro: string }> {
  return importarLinhaPessoaAction(itemId, dados as ParametrosImportarLinhaPessoa);
}

export async function finalizarRetomadaAction(importacaoId: string, status: "concluida" | "cancelada"): Promise<{ sucesso: true } | { erro: string }> {
  return finalizarImportacaoPessoasAction(importacaoId, status);
}

export async function desfazerImportacaoAction(
  importacaoId: string,
): Promise<{ removidas: number; protegidas: { pessoa_id: string; nome: string }[] } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await desfazerImportacao(supabase, { tenant_id: contexto.tenantId, importacao_id: importacaoId });

  if (!("erro" in resultado)) {
    revalidatePath("/clientes");
    revalidatePath("/fornecedores");
    revalidatePath(`/configuracoes/importacoes/${importacaoId}`);
  }

  return resultado;
}
