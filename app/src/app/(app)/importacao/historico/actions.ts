"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import {
  buscarItensParaRetomar,
  marcarImportacaoRetomando,
  preverDesfazerImportacaoPessoas,
  desfazerImportacaoPessoas,
  type ItemImportacao,
  type PreviaDesfazerImportacaoPessoas,
  type ResultadoDesfazerImportacaoPessoas,
} from "@/lib/importacoes/importacoes";
import { importarLinhaPessoaAction, finalizarImportacaoPessoasAction } from "../pessoas/actions";
import type { ParametrosImportarLinhaPessoa } from "../pessoas/actions";
import { retomarItemFinanceiroAction } from "../planilha/actions";
import type { LinhaParaImportar } from "../planilha/actions";
import {
  preverDesfazerImportacaoFinanceira,
  desfazerImportacaoFinanceira,
  finalizarImportacaoFinanceira,
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
// commitar de novo. dados_normalizados foi salvo com o formato certo pro
// tipo do lote (ParametrosImportarLinhaPessoa ou LinhaParaImportar), então
// dá pra repassar direto — mas o tipo precisa vir de fora, senão um lote
// financeiro sempre caía no importador de Pessoas (achado em revisão de
// código; ver spec 2026-08-26-importacao-execucao-servidor).
export async function retomarItemAction(
  itemId: string,
  dados: unknown,
  tipo: "financeiro" | "pessoas",
): Promise<{ evento_id: string } | { pessoa_id: string } | { erro: string }> {
  if (tipo === "financeiro") return retomarItemFinanceiroAction(itemId, dados as LinhaParaImportar);
  return importarLinhaPessoaAction(itemId, dados as ParametrosImportarLinhaPessoa);
}

// Mesmo motivo do retomarItemAction acima — sem o tipo, uma retomada
// financeira também acabava marcando o lote pelo caminho de Pessoas.
export async function finalizarRetomadaAction(
  importacaoId: string,
  status: "concluida" | "cancelada",
  tipo: "financeiro" | "pessoas",
): Promise<{ sucesso: true } | { erro: string }> {
  if (tipo === "financeiro") {
    const contexto = await obterUsuarioETenantAtual();
    if ("erro" in contexto) return { erro: contexto.erro };
    const supabase = await createClient();
    await finalizarImportacaoFinanceira(supabase, { importacao_id: importacaoId });
    return { sucesso: true };
  }
  return finalizarImportacaoPessoasAction(importacaoId, status);
}

export async function preverDesfazerImportacaoAction(importacaoId: string): Promise<PreviaDesfazerImportacaoPessoas | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  return preverDesfazerImportacaoPessoas(supabase, { tenant_id: contexto.tenantId, importacao_id: importacaoId });
}

// Mesmo princípio do desfazer financeiro: a prévia é sempre recalculada no
// servidor a partir só de importacaoId/tenant — o snapshot do cliente serve
// só pra comparar (nada mudou desde que a tela carregou) e decidir se a
// chamada segue, nunca pra decidir o que executar.
export async function desfazerImportacaoAction(
  importacaoId: string,
  previa: PreviaDesfazerImportacaoPessoas,
): Promise<ResultadoDesfazerImportacaoPessoas | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await desfazerImportacaoPessoas(supabase, {
    tenant_id: contexto.tenantId,
    importacao_id: importacaoId,
    criado_por: contexto.user.id,
    previa,
  });

  if (!("erro" in resultado)) {
    // Lançamento vinculado agora pode ser revertido junto — o efeito se
    // espalha pelo razão inteiro (relatório, indicador), mesmo raciocínio
    // já aplicado ao desfazer financeiro: 'layout' na raiz invalida o app
    // inteiro em vez de listar rota por rota.
    revalidatePath("/", "layout");
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
