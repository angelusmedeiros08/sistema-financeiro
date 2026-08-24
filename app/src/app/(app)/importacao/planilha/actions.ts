"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarChavesDuplicatas } from "@/lib/importacao/duplicatas";
import { criarEntidadeAprovada, type EntidadeNova } from "@/lib/importacao/resolucao";
import { commitarLinhaImportacao, type ParametrosCommitLinha } from "@/lib/importacao/commit";
import {
  iniciarImportacaoFinanceira,
  registrarEntidadeCriada,
  registrarItemImportacaoFinanceira,
  finalizarImportacaoFinanceira,
} from "@/lib/importacoes/importacoes-financeiro";

// Só as datas que aparecem no arquivo — nunca a tabela inteira do tenant.
export async function verificarDuplicatasAction(datasCompetencia: string[]): Promise<{ chaves: string[] } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const chaves = await buscarChavesDuplicatas(supabase, contexto.tenantId, datasCompetencia);
  return { chaves: [...chaves] };
}

// Nasce cedo de propósito — na abertura da etapa Cadastros, não só na
// execução — porque a criação de entidade acontece ali, antes de
// qualquer linha ser processada, e precisa de um importacao_id pra
// registrar proveniência (ver Fatia 4 da spec de importação).
export async function iniciarImportacaoFinanceiraAction(params: {
  nomeArquivo: string;
  totalLinhas: number;
}): Promise<{ importacaoId: string } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await iniciarImportacaoFinanceira(supabase, {
    tenant_id: contexto.tenantId,
    nome_arquivo: params.nomeArquivo,
    criado_por: contexto.user.id,
    total_linhas: params.totalLinhas,
  });

  if ("erro" in resultado) return resultado;
  return { importacaoId: resultado.importacao_id };
}

export type ResultadoEntidadeCriada = { valorOriginal: string; tipo: EntidadeNova["tipo"]; id?: string; erro?: string };

// Cria as poucas dezenas de entidades novas aprovadas na tela de revisão,
// sequencialmente — devolve um id (ou erro) por item, casado de volta pelo
// texto original que o cliente já guarda em ResolucaoEntidade.
// importacaoId é opcional pra não quebrar chamadas antigas/testes, mas o
// wizard real sempre passa (criado em iniciarImportacaoFinanceiraAction).
export async function criarEntidadesAprovadasAction(
  itens: EntidadeNova[],
  importacaoId?: string,
): Promise<{ resultados: ResultadoEntidadeCriada[] } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultados: ResultadoEntidadeCriada[] = [];

  for (const item of itens) {
    const resultado = await criarEntidadeAprovada(supabase, contexto.tenantId, item);
    if ("erro" in resultado) {
      resultados.push({ valorOriginal: item.nome, tipo: item.tipo, erro: resultado.erro });
      continue;
    }
    resultados.push({ valorOriginal: item.nome, tipo: item.tipo, id: resultado.id });
    if (importacaoId) {
      await registrarEntidadeCriada(supabase, { importacao_id: importacaoId, tenant_id: contexto.tenantId, tipo_entidade: item.tipo, entidade_id: resultado.id });
    }
  }

  return { resultados };
}

export type ParametrosImportarLinha = Omit<ParametrosCommitLinha, "tenant_id" | "criado_por"> & { importacaoId?: string; linhaNumero?: number };

export async function importarLinhaAction(params: ParametrosImportarLinha): Promise<{ evento_id: string } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const { importacaoId, linhaNumero, ...paramsCommit } = params;
  const resultado = await commitarLinhaImportacao(supabase, {
    ...paramsCommit,
    tenant_id: contexto.tenantId,
    criado_por: contexto.user.id,
  });

  if (importacaoId && linhaNumero !== undefined) {
    await registrarItemImportacaoFinanceira(supabase, {
      importacao_id: importacaoId,
      tenant_id: contexto.tenantId,
      linha_numero: linhaNumero,
      status: "erro" in resultado ? "erro" : "sucesso",
      evento_financeiro_id: "erro" in resultado ? null : resultado.evento_id,
      erro: "erro" in resultado ? resultado.erro : null,
    });
  }

  return resultado;
}

export async function finalizarImportacaoFinanceiraAction(importacaoId: string): Promise<void> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return;
  const supabase = await createClient();
  await finalizarImportacaoFinanceira(supabase, { importacao_id: importacaoId });
}

// Chamado uma vez no fim do wizard, depois que todas as linhas passaram
// (com sucesso ou erro) por importarLinhaAction — evita revalidar a cada
// linha em arquivos grandes.
export async function revalidarPosImportacaoAction(): Promise<void> {
  revalidatePath("/despesas");
  revalidatePath("/receitas");
  revalidatePath("/contas-a-pagar");
  revalidatePath("/contas-a-receber");
  revalidatePath("/painel");
}
