"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { extrairLinhasCategoria, resolverPessoaId, resolverCentroCustoIdSimples, resolverCategoriaIdSimples } from "./evento-financeiro";
import { criarRegraRecorrencia, editarRegraRecorrencia, cancelarRegraRecorrencia } from "./recorrencia";
import { extrairAnexosDraftDoFormData, anexarDraftsAoDono } from "./anexos";
import { parseNumeroBR } from "@/lib/formatacao";
import type { Database } from "@/utils/supabase/database.types";

type ResultadoAcao = { erro: string } | { sucesso: true };
type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];
type UnidadeIntervalo = Database["public"]["Enums"]["unidade_intervalo"];

function revalidarPaginasFinanceiras() {
  revalidatePath("/contas-a-receber");
  revalidatePath("/contas-a-pagar");
  revalidatePath("/despesas");
  revalidatePath("/receitas");
  revalidatePath("/configuracoes/recorrencias");
}

// Lê os campos de término do formulário: rádio "tipo_termino" decide qual
// dos dois (ou nenhum, pro caso indefinido) vai preenchido — nunca os dois.
function extrairTermino(formData: FormData): { numero_ocorrencias: number | null; data_fim: string | null } {
  const tipoTermino = String(formData.get("tipo_termino") ?? "INDEFINIDO");
  if (tipoTermino === "OCORRENCIAS") {
    const n = Number(formData.get("numero_ocorrencias") ?? "0");
    return { numero_ocorrencias: n > 0 ? n : null, data_fim: null };
  }
  if (tipoTermino === "DATA") {
    const data = String(formData.get("data_fim") ?? "");
    return { numero_ocorrencias: null, data_fim: data || null };
  }
  return { numero_ocorrencias: null, data_fim: null };
}

export async function criarRegraRecorrenciaAction(tipo: TipoCategoria, formData: FormData): Promise<ResultadoAcao> {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = parseNumeroBR(String(formData.get("valor") ?? ""));
  // mesmo campo de data do formulário simples (EventoFinanceiroForm) — a
  // série reusa o formulário inteiro, só troca o que a data significa
  // ("1º vencimento" vira "data de início da série").
  const dataInicio = String(formData.get("data_vencimento") ?? formData.get("data_inicio") ?? "");
  const numeroParcelas = Number(formData.get("numero_parcelas") ?? "1") || 1;
  const unidadeIntervalo = String(formData.get("unidade_intervalo") ?? "MES") as UnidadeIntervalo;
  const intervalo = Number(formData.get("intervalo") ?? "1") || 1;
  const pessoaId = String(formData.get("pessoa_id") ?? "") || undefined;
  const pessoaNomeNovo = String(formData.get("pessoa_nome_novo") ?? "") || undefined;

  if (!descricao || !dataInicio || valor <= 0) {
    return { erro: "Preencha descrição, valor (maior que zero) e data de início." };
  }
  if (numeroParcelas < 1 || numeroParcelas > 360) {
    return { erro: "Número de parcelas precisa estar entre 1 e 360." };
  }

  const { numero_ocorrencias, data_fim } = extrairTermino(formData);
  if (numero_ocorrencias !== null && numero_ocorrencias > 1200) {
    return { erro: "Número de ocorrências não pode passar de 1200." };
  }

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };
  const { user, tenantId } = contexto;

  const supabase = await createClient();

  await resolverCentroCustoIdSimples(supabase, tenantId, formData);
  const erroCategoriaNova = await resolverCategoriaIdSimples(supabase, tenantId, tipo, formData);
  if (erroCategoriaNova) return erroCategoriaNova;

  const categoriaId = String(formData.get("categoria_id") ?? "");
  const categorias = extrairLinhasCategoria(formData, categoriaId, valor);
  if ("erro" in categorias) return categorias;
  if (!categoriaId && categorias.length === 1) {
    return { erro: "Selecione uma categoria." };
  }

  const pessoaResolvidaId = await resolverPessoaId(supabase, tenantId, {
    pessoaId,
    nomeNovaPessoa: pessoaNomeNovo,
    perfil: tipo === "RECEITA" ? "CLIENTE" : "FORNECEDOR",
  });

  const resultado = await criarRegraRecorrencia(supabase, {
    tenant_id: tenantId,
    tipo,
    descricao,
    valor_total: valor,
    categorias,
    pessoa_id: pessoaResolvidaId,
    numero_parcelas: numeroParcelas,
    unidade_intervalo: unidadeIntervalo,
    intervalo,
    data_inicio: dataInicio,
    numero_ocorrencias,
    data_fim,
    criado_por: user.id,
  });

  if ("erro" in resultado) return resultado;

  // anexo da série (ex.: contrato) pertence à regra em si, não a uma
  // ocorrência específica — mesmo que a 1ª ocorrência já tenha sido gerada.
  const anexosDraft = extrairAnexosDraftDoFormData(formData);
  if (anexosDraft.length > 0) {
    await anexarDraftsAoDono(supabase, anexosDraft, {
      tenant_id: tenantId,
      regra_recorrencia_id: resultado.regra_id,
      criado_por: user.id,
    });
  }

  revalidarPaginasFinanceiras();
  return { sucesso: true };
}

export async function cancelarRegraRecorrenciaAction(formData: FormData): Promise<ResultadoAcao> {
  const regraId = String(formData.get("regra_id") ?? "");
  if (!regraId) return { erro: "Série inválida." };

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await cancelarRegraRecorrencia(supabase, { tenant_id: contexto.tenantId, regra_id: regraId });
  if ("erro" in resultado) return resultado;

  revalidarPaginasFinanceiras();
  return { sucesso: true };
}

export async function editarRegraRecorrenciaAction(formData: FormData): Promise<ResultadoAcao> {
  const regraId = String(formData.get("regra_id") ?? "");
  if (!regraId) return { erro: "Série inválida." };

  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = parseNumeroBR(String(formData.get("valor") ?? ""));
  const unidadeIntervalo = String(formData.get("unidade_intervalo") ?? "") as UnidadeIntervalo | "";
  const intervalo = Number(formData.get("intervalo") ?? "0");
  const numeroParcelas = Number(formData.get("numero_parcelas") ?? "0");

  const { numero_ocorrencias, data_fim } = extrairTermino(formData);

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();

  if (Number.isFinite(valor) && valor > 0) {
    const { data: regra } = await supabase
      .from("regras_recorrencia")
      .select("tipo")
      .eq("id", regraId)
      .eq("tenant_id", contexto.tenantId)
      .maybeSingle();
    if (regra) {
      const erroCategoriaNova = await resolverCategoriaIdSimples(supabase, contexto.tenantId, regra.tipo, formData);
      if (erroCategoriaNova) return erroCategoriaNova;
    }
  }
  const categoriaId = String(formData.get("categoria_id") ?? "");

  const categorias = Number.isFinite(valor) && valor > 0 ? extrairLinhasCategoria(formData, categoriaId, valor) : undefined;
  if (categorias && "erro" in categorias) return categorias;

  const resultado = await editarRegraRecorrencia(supabase, {
    regra_id: regraId,
    tenant_id: contexto.tenantId,
    descricao: descricao || undefined,
    valor_total: Number.isFinite(valor) && valor > 0 ? valor : undefined,
    categorias,
    unidade_intervalo: unidadeIntervalo || undefined,
    intervalo: intervalo > 0 ? intervalo : undefined,
    numero_parcelas: numeroParcelas > 0 ? numeroParcelas : undefined,
    numero_ocorrencias,
    data_fim,
  });

  if ("erro" in resultado) return resultado;

  revalidarPaginasFinanceiras();
  return { sucesso: true };
}
