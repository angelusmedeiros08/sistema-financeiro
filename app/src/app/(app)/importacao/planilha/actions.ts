"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarChavesDuplicatas } from "@/lib/importacao/duplicatas";
import { LIMITE_LINHAS } from "@/lib/importacao/parse";
import { criarEntidadeAprovada, type EntidadeNova } from "@/lib/importacao/resolucao";
import { commitarLinhaImportacao, type ParametrosCommitLinha } from "@/lib/importacao/commit";
import { reivindicarProcessamento } from "@/lib/importacoes/importacoes";
import {
  iniciarImportacaoFinanceira,
  registrarEntidadeCriada,
  registrarItensPendentesFinanceira,
  atualizarItemImportacaoFinanceira,
  finalizarImportacaoFinanceira,
} from "@/lib/importacoes/importacoes-financeiro";
import type { Database, Json } from "@/utils/supabase/database.types";

type Cliente = SupabaseClient<Database>;

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

  // Confirma UMA vez, antes do loop, que importacaoId é de fato deste
  // tenant — sem isso, a policy de INSERT de importacoes_entidades_criadas
  // só valida o tenant_id da linha nova, nunca a referência, então um
  // importacaoId forjado gravaria uma proveniência órfã apontando pra
  // importação de outro tenant (achado em auditoria de segurança). Grava
  // como se não tivesse vindo nenhum importacaoId — a criação da entidade
  // em si continua normal, só a proveniência é que fica de fora.
  let importacaoIdValidado = importacaoId;
  if (importacaoIdValidado) {
    const { data: importacao } = await supabase
      .from("importacoes")
      .select("id")
      .eq("id", importacaoIdValidado)
      .eq("tenant_id", contexto.tenantId)
      .maybeSingle();
    if (!importacao) importacaoIdValidado = undefined;
  }

  const resultados: ResultadoEntidadeCriada[] = [];

  for (const item of itens) {
    const resultado = await criarEntidadeAprovada(supabase, contexto.tenantId, item);
    if ("erro" in resultado) {
      resultados.push({ valorOriginal: item.nome, tipo: item.tipo, erro: resultado.erro });
      continue;
    }
    resultados.push({ valorOriginal: item.nome, tipo: item.tipo, id: resultado.id });
    if (importacaoIdValidado) {
      await registrarEntidadeCriada(supabase, { importacao_id: importacaoIdValidado, tenant_id: contexto.tenantId, tipo_entidade: item.tipo, entidade_id: resultado.id });
    }
  }

  return { resultados };
}

export type LinhaParaImportar = Omit<ParametrosCommitLinha, "tenant_id" | "criado_por"> & { linhaNumero: number };
export type ResultadoLinhaImportacao = { sucesso: boolean; erro?: string };

// Commit de uma linha + atualização do item de rastreio — compartilhado
// entre a execução principal (abaixo) e retomarItemFinanceiroAction, pra
// não duplicar a mesma sequência "commitar, depois marcar sucesso/erro"
// em dois lugares (achado em revisão de código: as duas cópias podiam
// divergir silenciosamente).
async function processarLinhaFinanceira(
  supabase: Cliente,
  tenantId: string,
  criadoPor: string,
  itemId: string,
  dados: LinhaParaImportar,
): Promise<{ evento_id: string } | { erro: string }> {
  const { linhaNumero: _linhaNumero, ...paramsCommit } = dados;
  const resultado = await commitarLinhaImportacao(supabase, {
    ...paramsCommit,
    tenant_id: tenantId,
    criado_por: criadoPor,
  });

  await atualizarItemImportacaoFinanceira(supabase, {
    item_id: itemId,
    status: "erro" in resultado ? "erro" : "sucesso",
    evento_financeiro_id: "erro" in resultado ? null : resultado.evento_id,
    erro: "erro" in resultado ? resultado.erro : null,
  });

  return resultado;
}

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

  // O limite de linhas é checado no navegador na etapa de upload, mas nada
  // impede chamar esta Server Action direto com mais — revalida aqui
  // também (achado em auditoria de segurança: sem isso, um usuário
  // autenticado podia disparar um loop de dezenas de milhares de RPCs numa
  // única requisição).
  if (linhas.length > LIMITE_LINHAS) {
    return { erro: `Lote com ${linhas.length} linhas — o limite por importação é ${LIMITE_LINHAS}.` };
  }

  const supabase = await createClient();

  // Item "pendente" de cada linha, registrado ANTES de qualquer commit —
  // só assim uma queda do servidor no meio do loop deixa rastro de quanto
  // faltou (e dado suficiente pra retomar depois). Ver
  // registrarItensPendentesFinanceira. Também reivindica o lock de
  // processamento — impede uma segunda aba/sessão de rodar Retomar
  // enquanto esta execução ainda está em voo (achado em revisão de
  // código: duplicaria baixa/lançamento).
  let itensPorLinha: Record<number, string> = {};
  if (importacaoId) {
    const lock = await reivindicarProcessamento(supabase, { tenant_id: contexto.tenantId, importacao_id: importacaoId });
    if ("erro" in lock) return { erro: lock.erro };

    const registro = await registrarItensPendentesFinanceira(supabase, {
      importacao_id: importacaoId,
      tenant_id: contexto.tenantId,
      linhas: linhas.map((l) => ({ linha_numero: l.linhaNumero, dados: l as unknown as Json })),
    });
    if ("erro" in registro) return { erro: registro.erro };
    itensPorLinha = registro.itensPorLinha;
  }

  const resultados: ResultadoLinhaImportacao[] = [];

  for (const linha of linhas) {
    const itemId = itensPorLinha[linha.linhaNumero];
    let resultado: { evento_id: string } | { erro: string };
    if (itemId) {
      resultado = await processarLinhaFinanceira(supabase, contexto.tenantId, contexto.user.id, itemId, linha);
    } else {
      // Só acontece sem importacaoId (sem rastreio, ex.: chamada de teste) —
      // sem item pra atualizar, commita direto.
      const { linhaNumero: _linhaNumero, ...paramsCommit } = linha;
      resultado = await commitarLinhaImportacao(supabase, { ...paramsCommit, tenant_id: contexto.tenantId, criado_por: contexto.user.id });
    }

    resultados.push("erro" in resultado ? { sucesso: false, erro: resultado.erro } : { sucesso: true });
  }

  if (importacaoId) await finalizarImportacaoFinanceira(supabase, { importacao_id: importacaoId });

  return { resultados };
}

// Reprocessa uma única linha que ficou pendente/com erro (ver Retomar, em
// historico/actions.ts) — o item já existe (criado em
// registrarItensPendentesFinanceira quando o lote rodou), só falta
// commitar de novo com o mesmo dado que foi persistido.
export async function retomarItemFinanceiroAction(itemId: string, dados: LinhaParaImportar): Promise<{ evento_id: string } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  return processarLinhaFinanceira(supabase, contexto.tenantId, contexto.user.id, itemId, dados);
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
