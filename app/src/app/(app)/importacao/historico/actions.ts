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
import {
  preverDesfazerImportacaoFinanceira,
  desfazerImportacaoFinanceira,
  type PreviaDesfazerFinanceira,
  type ResultadoDesfazerFinanceira,
} from "@/lib/importacoes/importacoes-financeiro";

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

export async function preverDesfazerImportacaoFinanceiraAction(importacaoId: string): Promise<PreviaDesfazerFinanceira | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  return preverDesfazerImportacaoFinanceira(supabase, { tenant_id: contexto.tenantId, importacao_id: importacaoId });
}

// A prévia é sempre recalculada no servidor a partir do que o cliente
// confirmou (não confia em nada calculado no browser) — mas nunca
// reavalia a classificação, só executa exatamente o snapshot recebido,
// como já documentado em desfazerImportacaoFinanceira().
export async function desfazerImportacaoFinanceiraAction(
  importacaoId: string,
  previa: PreviaDesfazerFinanceira,
  incluirModificados: boolean,
): Promise<ResultadoDesfazerFinanceira | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await desfazerImportacaoFinanceira(supabase, {
    tenant_id: contexto.tenantId,
    importacao_id: importacaoId,
    criado_por: contexto.user.id,
    previa,
    incluirModificados,
  });

  if (!("erro" in resultado)) {
    // Desfazer importação agora reverte tudo, quitado ou não (baixa
    // incluída) — o efeito se espalha pelo razão inteiro, então listar
    // rota por rota (relatórios, indicadores, DRE, aging...) é frágil e
    // some silenciosamente do dia que alguém adicionar um relatório novo.
    // 'layout' na raiz invalida o app inteiro pro próximo acesso, do jeito
    // documentado pra "revalidar tudo" (ver node_modules/next/dist/docs).
    revalidatePath("/", "layout");
  }

  return resultado;
}
