"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarChavesDuplicatas } from "@/lib/importacao/duplicatas";
import { criarEntidadeAprovada, type EntidadeNova } from "@/lib/importacao/resolucao";
import { commitarLinhaImportacao, type ParametrosCommitLinha } from "@/lib/importacao/commit";

// Só as datas que aparecem no arquivo — nunca a tabela inteira do tenant.
export async function verificarDuplicatasAction(datasCompetencia: string[]): Promise<{ chaves: string[] } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const chaves = await buscarChavesDuplicatas(supabase, contexto.tenantId, datasCompetencia);
  return { chaves: [...chaves] };
}

export type ResultadoEntidadeCriada = { valorOriginal: string; tipo: EntidadeNova["tipo"]; id?: string; erro?: string };

// Cria as poucas dezenas de entidades novas aprovadas na tela de revisão,
// sequencialmente — devolve um id (ou erro) por item, casado de volta pelo
// texto original que o cliente já guarda em ResolucaoEntidade.
export async function criarEntidadesAprovadasAction(itens: EntidadeNova[]): Promise<{ resultados: ResultadoEntidadeCriada[] } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultados: ResultadoEntidadeCriada[] = [];

  for (const item of itens) {
    const resultado = await criarEntidadeAprovada(supabase, contexto.tenantId, item);
    resultados.push(
      "erro" in resultado
        ? { valorOriginal: item.nome, tipo: item.tipo, erro: resultado.erro }
        : { valorOriginal: item.nome, tipo: item.tipo, id: resultado.id },
    );
  }

  return { resultados };
}

export type ParametrosImportarLinha = Omit<ParametrosCommitLinha, "tenant_id" | "criado_por">;

export async function importarLinhaAction(params: ParametrosImportarLinha): Promise<{ evento_id: string } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  return commitarLinhaImportacao(supabase, {
    ...params,
    tenant_id: contexto.tenantId,
    criado_por: contexto.user.id,
  });
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
