"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { rotaValida, itemCatalogoDaRota } from "@/lib/apresentacao/catalogo";

type ResultadoAcao = { erro: string } | { sucesso: true; id: string };

type DadosApresentacao = { nome: string; intervaloSegundos: number; rotas: string[] };

function validarDados({ nome, intervaloSegundos, rotas }: DadosApresentacao): { erro: string } | { ok: true } {
  if (!nome.trim()) return { erro: "Informe o nome da apresentação." };
  if (intervaloSegundos < 5 || intervaloSegundos > 300) {
    return { erro: "O intervalo do Modo TV deve estar entre 5 e 300 segundos." };
  }
  if (rotas.some((rota) => !rotaValida(rota))) {
    return { erro: "Uma das telas selecionadas não é válida." };
  }
  return { ok: true };
}

// RPC `salvar_apresentacao` cria/atualiza a apresentação e substitui a lista
// de slides inteira numa única transação de banco — achado em revisão de
// código: fazer isso em dois passos separados (delete e insert do lado do
// app) deixava uma falha entre os dois passos apagar os slides antigos sem
// recuperação, e uma falha entre criar a apresentação e inserir seus slides
// deixava uma linha "fantasma" com 0 slides.
async function salvar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    apresentacaoId,
    tenantId,
    criadoPor,
    dados,
  }: { apresentacaoId: string | null; tenantId: string; criadoPor: string; dados: DadosApresentacao },
): Promise<ResultadoAcao> {
  const slides = dados.rotas.map((rota, ordem) => ({ ordem, rota, rotulo: itemCatalogoDaRota(rota)!.rotulo }));

  const { data, error } = await supabase.rpc("salvar_apresentacao", {
    p_tenant_id: tenantId,
    // Os tipos gerados marcam todo parâmetro de função como string
    // obrigatória (limitação do gerador, não reflete que o parâmetro SQL
    // aceita null) — cast necessário pra passar null de verdade na criação.
    p_apresentacao_id: apresentacaoId as string,
    p_nome: dados.nome.trim(),
    p_intervalo_segundos: dados.intervaloSegundos,
    p_criado_por: criadoPor,
    p_slides: slides,
  });

  if (error || !data) return { erro: error?.message ?? "Não foi possível salvar a apresentação." };
  return { sucesso: true, id: data };
}

export async function criarApresentacao(dados: DadosApresentacao): Promise<ResultadoAcao> {
  const validacao = validarDados(dados);
  if ("erro" in validacao) return validacao;

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await salvar(supabase, {
    apresentacaoId: null,
    tenantId: contexto.tenantId,
    criadoPor: contexto.user.id,
    dados,
  });
  if ("erro" in resultado) return resultado;

  revalidatePath("/apresentacoes");
  return resultado;
}

export async function atualizarApresentacao(apresentacaoId: string, dados: DadosApresentacao): Promise<ResultadoAcao> {
  const validacao = validarDados(dados);
  if ("erro" in validacao) return validacao;

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await salvar(supabase, {
    apresentacaoId,
    tenantId: contexto.tenantId,
    criadoPor: contexto.user.id,
    dados,
  });
  if ("erro" in resultado) return resultado;

  revalidatePath("/apresentacoes");
  revalidatePath(`/apresentacoes/${apresentacaoId}`);
  return resultado;
}

export async function excluirApresentacao(apresentacaoId: string): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const { error } = await supabase.from("apresentacoes").delete().eq("id", apresentacaoId).eq("tenant_id", contexto.tenantId);

  if (error) return { erro: error.message };

  revalidatePath("/apresentacoes");
  return { sucesso: true, id: apresentacaoId };
}
