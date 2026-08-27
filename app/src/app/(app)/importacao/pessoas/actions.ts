"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { commitarLinhaPessoa, type ParametrosCommitLinhaPessoa } from "@/lib/pessoas/importacao/commit";
import { iniciarImportacao, atualizarItemImportacao, finalizarImportacao, reivindicarProcessamento } from "@/lib/importacoes/importacoes";
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

export type ResultadoLinhaImportacaoPessoa = { sucesso: boolean; erro?: string };

// Roda o lote inteiro dentro de UMA Server Action, do início ao fim, no
// servidor — antes, o cliente orquestrava a sequência (iniciar → uma ação
// por linha, num loop → finalizar) e só ele sabia quando tinha terminado.
// Se o usuário saísse da tela no meio, o loop ficava rodando escondido ou
// parava pela metade sem nunca finalizar, deixando o lote travado em
// "em_andamento" pra sempre. Ver spec 2026-08-26-importacao-execucao-
// servidor. Reaproveita as 3 ações já existentes (iniciar/por linha/
// finalizar) por dentro — chamada função-a-função, sem round-trip de rede
// nenhum entre elas, já que tudo roda dentro desta mesma requisição.
export async function executarImportacaoPessoasAction(
  nomeArquivo: string,
  linhas: (ParametrosImportarLinhaPessoa & { linhaNumero: number })[],
): Promise<{ importacaoId: string; resultados: ResultadoLinhaImportacaoPessoa[] } | { erro: string }> {
  const inicio = await iniciarImportacaoPessoasAction(nomeArquivo, linhas);
  if ("erro" in inicio) return inicio;

  // Mesmo lock que a importação financeira já usa (achado em revisão de
  // código: faltava aqui) — não impede duas abas criarem dois LOTES
  // diferentes do zero (cada `iniciarImportacaoPessoasAction` acima já
  // nasce com seu próprio importacao_id), mas impede que este mesmo lote
  // seja processado duas vezes em paralelo (ex.: um retry de rede
  // reenviando esta mesma Server Action). A proteção contra pessoa
  // duplicada em si é o trigger de documento único (ver migration
  // bloqueia_documento_pessoa_duplicado).
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return contexto;
  const supabase = await createClient();
  const lock = await reivindicarProcessamento(supabase, { tenant_id: contexto.tenantId, importacao_id: inicio.importacao_id });
  if ("erro" in lock) return lock;

  const resultados: ResultadoLinhaImportacaoPessoa[] = [];
  for (const item of linhas) {
    const itemId = inicio.itensPorLinha[item.linhaNumero];
    const resultado = await importarLinhaPessoaAction(itemId, {
      acao: item.acao,
      pessoaIdExistente: item.pessoaIdExistente,
      permitirAtualizarNome: item.permitirAtualizarNome,
      nome: item.nome,
      documento: item.documento,
      natureza: item.natureza,
      email: item.email,
      telefone: item.telefone,
      perfisNovos: item.perfisNovos,
      campos_personalizados: item.campos_personalizados,
      endereco: item.endereco,
      contato: item.contato,
    });
    resultados.push("erro" in resultado ? { sucesso: false, erro: resultado.erro } : { sucesso: true });
  }

  await finalizarImportacaoPessoasAction(inicio.importacao_id, "concluida");
  return { importacaoId: inicio.importacao_id, resultados };
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
