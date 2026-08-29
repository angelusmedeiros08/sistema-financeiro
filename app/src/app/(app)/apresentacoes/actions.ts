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

// Substitui a lista inteira de slides (delete-and-reinsert por ordem — spec
// Seção 5) em vez de diff incremental: a lista é tipicamente pequena (no
// máximo as 11 telas do catálogo) e o formulário sempre envia o estado
// completo já reordenado.
async function substituirSlides(supabase: Awaited<ReturnType<typeof createClient>>, apresentacaoId: string, rotas: string[]) {
  const { error: erroDelete } = await supabase.from("apresentacao_slides").delete().eq("apresentacao_id", apresentacaoId);
  if (erroDelete) return { erro: erroDelete.message };

  if (rotas.length === 0) return { erro: "" };

  const { error: erroInsert } = await supabase.from("apresentacao_slides").insert(
    rotas.map((rota, ordem) => ({
      apresentacao_id: apresentacaoId,
      ordem,
      rota,
      rotulo: itemCatalogoDaRota(rota)!.rotulo,
    })),
  );
  return { erro: erroInsert?.message ?? "" };
}

export async function criarApresentacao(dados: DadosApresentacao): Promise<ResultadoAcao> {
  const validacao = validarDados(dados);
  if ("erro" in validacao) return validacao;

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const { data: apresentacao, error } = await supabase
    .from("apresentacoes")
    .insert({
      tenant_id: contexto.tenantId,
      nome: dados.nome.trim(),
      intervalo_segundos: dados.intervaloSegundos,
      criado_por: contexto.user.id,
    })
    .select("id")
    .single();

  if (error || !apresentacao) return { erro: error?.message ?? "Não foi possível criar a apresentação." };

  const resultadoSlides = await substituirSlides(supabase, apresentacao.id, dados.rotas);
  if (resultadoSlides.erro) return { erro: resultadoSlides.erro };

  revalidatePath("/apresentacoes");
  return { sucesso: true, id: apresentacao.id };
}

export async function atualizarApresentacao(apresentacaoId: string, dados: DadosApresentacao): Promise<ResultadoAcao> {
  const validacao = validarDados(dados);
  if ("erro" in validacao) return validacao;

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const { error } = await supabase
    .from("apresentacoes")
    .update({
      nome: dados.nome.trim(),
      intervalo_segundos: dados.intervaloSegundos,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", apresentacaoId)
    .eq("tenant_id", contexto.tenantId);

  if (error) return { erro: error.message };

  const resultadoSlides = await substituirSlides(supabase, apresentacaoId, dados.rotas);
  if (resultadoSlides.erro) return { erro: resultadoSlides.erro };

  revalidatePath("/apresentacoes");
  revalidatePath(`/apresentacoes/${apresentacaoId}`);
  return { sucesso: true, id: apresentacaoId };
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
