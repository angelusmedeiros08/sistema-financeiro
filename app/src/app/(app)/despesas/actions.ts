"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { criarEventoFinanceiro, resolverPessoaId, extrairLinhasCategoria } from "@/lib/contabil/evento-financeiro";

type ResultadoAcao = { erro: string } | { sucesso: true };

export async function criarDespesa(formData: FormData): Promise<ResultadoAcao> {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valorTexto = String(formData.get("valor") ?? "").replace(",", ".");
  const dataVencimento = String(formData.get("data_vencimento") ?? "");
  const categoriaId = String(formData.get("categoria_id") ?? "");
  const numeroParcelas = Number(formData.get("numero_parcelas") ?? "1") || 1;
  const pessoaId = String(formData.get("pessoa_id") ?? "") || undefined;
  const pessoaNomeNovo = String(formData.get("pessoa_nome_novo") ?? "") || undefined;

  const valor = Number(valorTexto);
  if (!descricao || !dataVencimento || !Number.isFinite(valor) || valor <= 0) {
    return { erro: "Preencha descrição, valor (maior que zero) e vencimento." };
  }

  const categorias = extrairLinhasCategoria(formData, categoriaId, valor);
  if ("erro" in categorias) return categorias;
  if (!categoriaId && categorias.length === 1) {
    return { erro: "Selecione uma categoria." };
  }

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };
  const { user, tenantId } = contexto;

  const supabase = await createClient();

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
  });

  if ("erro" in resultado) {
    return { erro: resultado.erro };
  }

  revalidatePath("/despesas");
  revalidatePath("/contas-a-pagar");
  revalidatePath("/painel");
  return { sucesso: true };
}
