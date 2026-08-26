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

export type LinhaParaImportar = Omit<ParametrosCommitLinha, "tenant_id" | "criado_por"> & { linhaNumero?: number };
export type ResultadoLinhaImportacao = { sucesso: boolean; erro?: string };

// Roda o lote inteiro dentro de UMA Server Action, do início ao fim, no
// servidor — antes, o cliente chamava uma ação por linha num loop
// (importarLinhaAction) e só ele sabia quando tinha terminado, chamando
// finalizarImportacaoFinanceiraAction no fim. Se o usuário saísse da tela
// no meio, o loop continuava rodando escondido (navegação dentro do app
// não derruba a promise) ou parava pela metade sem nunca finalizar (fechar
// a aba), deixando o lote travado em "em_andamento" pra sempre. Ver spec
// 2026-08-26-importacao-execucao-servidor — sair da tela agora nunca mais
// interrompe nada, porque a operação inteira é uma única requisição.
export async function executarImportacaoFinanceiraAction(
  importacaoId: string | null,
  linhas: LinhaParaImportar[],
): Promise<{ resultados: ResultadoLinhaImportacao[] } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultados: ResultadoLinhaImportacao[] = [];

  for (const { linhaNumero, ...paramsCommit } of linhas) {
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

    resultados.push("erro" in resultado ? { sucesso: false, erro: resultado.erro } : { sucesso: true });
  }

  if (importacaoId) await finalizarImportacaoFinanceira(supabase, { importacao_id: importacaoId });

  return { resultados };
}

// Chamado uma vez no fim do wizard, depois que todas as linhas passaram
// (com sucesso ou erro) por executarImportacaoFinanceiraAction — evita
// revalidar a cada linha em arquivos grandes.
export async function revalidarPosImportacaoAction(): Promise<void> {
  revalidatePath("/despesas");
  revalidatePath("/receitas");
  revalidatePath("/contas-a-pagar");
  revalidatePath("/contas-a-receber");
  revalidatePath("/painel");
}
