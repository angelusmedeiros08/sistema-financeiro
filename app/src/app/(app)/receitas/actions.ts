"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { criarEventoFinanceiro, resolverPessoaId } from "@/lib/contabil/evento-financeiro";

type ResultadoAcao = { erro: string } | { sucesso: true };

export async function criarReceita(formData: FormData): Promise<ResultadoAcao> {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valorTexto = String(formData.get("valor") ?? "").replace(",", ".");
  const dataVencimento = String(formData.get("data_vencimento") ?? "");
  const categoriaId = String(formData.get("categoria_id") ?? "");
  const numeroParcelas = Number(formData.get("numero_parcelas") ?? "1") || 1;
  const pessoaId = String(formData.get("pessoa_id") ?? "") || undefined;
  const pessoaNomeNovo = String(formData.get("pessoa_nome_novo") ?? "") || undefined;

  const valor = Number(valorTexto);
  if (!descricao || !dataVencimento || !categoriaId || !Number.isFinite(valor) || valor <= 0) {
    return { erro: "Preencha descrição, valor (maior que zero), vencimento e categoria." };
  }

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };
  const { user, tenantId } = contexto;

  const supabase = await createClient();

  const { data: categoria, error: erroCategoria } = await supabase
    .from("categorias_financeiras")
    .select("id, conta_contabil_id")
    .eq("id", categoriaId)
    .eq("tenant_id", tenantId)
    .single();

  if (erroCategoria || !categoria?.conta_contabil_id) {
    return { erro: "Categoria inválida." };
  }

  const pessoaResolvidaId = await resolverPessoaId(supabase, tenantId, {
    pessoaId,
    nomeNovaPessoa: pessoaNomeNovo,
    perfil: "CLIENTE",
  });

  const resultado = await criarEventoFinanceiro(supabase, {
    tenant_id: tenantId,
    tipo: "RECEITA",
    descricao,
    valor_total: valor,
    data_competencia: dataVencimento,
    categoria_id: categoriaId,
    conta_contabil_categoria_id: categoria.conta_contabil_id,
    pessoa_id: pessoaResolvidaId,
    numero_parcelas: numeroParcelas,
    primeiro_vencimento: dataVencimento,
    criado_por: user.id,
  });

  if ("erro" in resultado) {
    return { erro: resultado.erro };
  }

  revalidatePath("/receitas");
  revalidatePath("/contas-a-receber");
  revalidatePath("/painel");
  return { sucesso: true };
}
