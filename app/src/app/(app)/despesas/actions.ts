"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import {
  criarEventoFinanceiro,
  editarEventoFinanceiro,
  resolverPessoaId,
  resolverCentroCustoIdSimples,
  resolverCategoriaIdSimples,
  extrairLinhasCategoria,
} from "@/lib/contabil/evento-financeiro";
import { extrairAnexosDraftDoFormData, anexarDraftsAoDono } from "@/lib/contabil/anexos";
import { criarRegraRecorrenciaAction } from "@/lib/contabil/recorrencia-actions";
import { parseNumeroBR } from "@/lib/formatacao";

type ResultadoAcao = { erro: string } | { sucesso: true };

export async function criarDespesa(formData: FormData): Promise<ResultadoAcao> {
  // "Repetir lançamento?" ligado desvia pra criação de uma série — o
  // próprio evento financeiro só existe quando o job (ou a geração
  // imediata na criação) gerar a 1ª ocorrência, nunca cria os dois.
  if (formData.get("repetir_lancamento") === "on") {
    return criarRegraRecorrenciaAction("DESPESA", formData);
  }

  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = parseNumeroBR(String(formData.get("valor") ?? ""));
  const dataVencimento = String(formData.get("data_vencimento") ?? "");
  const numeroParcelas = Number(formData.get("numero_parcelas") ?? "1") || 1;
  const pessoaId = String(formData.get("pessoa_id") ?? "") || undefined;
  const pessoaNomeNovo = String(formData.get("pessoa_nome_novo") ?? "") || undefined;
  const idempotencyKey = String(formData.get("idempotency_key") ?? "") || undefined;

  if (!descricao || !dataVencimento || valor <= 0) {
    return { erro: "Preencha descrição, valor (maior que zero) e vencimento." };
  }
  if (numeroParcelas < 1 || numeroParcelas > 360) {
    return { erro: "Número de parcelas precisa estar entre 1 e 360." };
  }

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };
  const { user, tenantId } = contexto;

  const supabase = await createClient();

  await resolverCentroCustoIdSimples(supabase, tenantId, formData);
  const erroCategoriaNova = await resolverCategoriaIdSimples(supabase, tenantId, "DESPESA", formData);
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
    perfil: "FORNECEDOR",
  });

  const resultado = await criarEventoFinanceiro(supabase, {
    tenant_id: tenantId,
    tipo: "DESPESA",
    descricao,
    valor_total: valor,
    data_competencia: dataVencimento,
    categorias,
    pessoa_id: pessoaResolvidaId,
    numero_parcelas: numeroParcelas,
    primeiro_vencimento: dataVencimento,
    criado_por: user.id,
    import_key: idempotencyKey,
  });

  if ("erro" in resultado) {
    return { erro: resultado.erro };
  }

  const anexosDraft = extrairAnexosDraftDoFormData(formData);
  if (anexosDraft.length > 0) {
    await anexarDraftsAoDono(supabase, anexosDraft, {
      tenant_id: tenantId,
      evento_financeiro_id: resultado.evento_id,
      criado_por: user.id,
    });
  }

  revalidatePath("/despesas");
  revalidatePath("/contas-a-pagar");
  revalidatePath("/painel");
  return { sucesso: true };
}

type ResultadoEdicao = { erro: string } | { sucesso: true; evento_id: string; recriado: boolean };

export async function editarDespesa(eventoId: string, formData: FormData): Promise<ResultadoEdicao> {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = parseNumeroBR(String(formData.get("valor") ?? ""));
  const pessoaId = String(formData.get("pessoa_id") ?? "") || undefined;
  const pessoaNomeNovo = String(formData.get("pessoa_nome_novo") ?? "") || undefined;

  if (!descricao || valor <= 0) {
    return { erro: "Preencha descrição e valor (maior que zero)." };
  }

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };
  const { user, tenantId } = contexto;

  const supabase = await createClient();

  await resolverCentroCustoIdSimples(supabase, tenantId, formData);
  const erroCategoriaNova = await resolverCategoriaIdSimples(supabase, tenantId, "DESPESA", formData);
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
    perfil: "FORNECEDOR",
  });

  const resultado = await editarEventoFinanceiro(supabase, {
    tenant_id: tenantId,
    evento_id: eventoId,
    descricao,
    valor_total: valor,
    categorias,
    pessoa_id: pessoaResolvidaId,
    criado_por: user.id,
  });

  if ("erro" in resultado) return { erro: resultado.erro };

  revalidatePath("/despesas");
  revalidatePath("/contas-a-pagar");
  revalidatePath("/painel");
  revalidatePath(`/despesas/${eventoId}`);
  return { sucesso: true, evento_id: resultado.evento_id, recriado: resultado.recriado };
}
