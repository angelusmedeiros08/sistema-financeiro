"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { registrarLancamento } from "@/lib/contabil/ledger";
import { CODIGO_CONTAS_A_PAGAR } from "@/lib/contabil/plano-padrao";

type ResultadoAcao = { erro: string } | { sucesso: true };

export async function criarDespesa(formData: FormData): Promise<ResultadoAcao> {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valorTexto = String(formData.get("valor") ?? "").replace(",", ".");
  const dataVencimento = String(formData.get("data_vencimento") ?? "");
  const categoriaId = String(formData.get("categoria_id") ?? "");

  const valor = Number(valorTexto);
  if (!descricao || !dataVencimento || !categoriaId || !Number.isFinite(valor) || valor <= 0) {
    return { erro: "Preencha descrição, valor (maior que zero), vencimento e categoria." };
  }

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };
  const { user, tenantId } = contexto;

  const supabase = await createClient();

  // nunca confiamos no conta_contabil_id vindo do formulário — sempre
  // buscamos de novo no servidor, escopado ao tenant do usuário autenticado.
  const { data: categoria, error: erroCategoria } = await supabase
    .from("categorias_financeiras")
    .select("id, conta_contabil_id")
    .eq("id", categoriaId)
    .eq("tenant_id", tenantId)
    .single();

  if (erroCategoria || !categoria?.conta_contabil_id) {
    return { erro: "Categoria inválida." };
  }

  const { data: contaAPagar, error: erroContaAPagar } = await supabase
    .from("contas_contabeis")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("codigo", CODIGO_CONTAS_A_PAGAR)
    .single();

  if (erroContaAPagar || !contaAPagar) {
    return { erro: "Conta contábil 'Contas a Pagar' não encontrada para este tenant." };
  }

  const dataCompetencia = dataVencimento; // Fase 0+1: sem distinção de data de emissão vs. vencimento na UI ainda

  const { data: evento, error: erroEvento } = await supabase
    .from("eventos_financeiros")
    .insert({
      tenant_id: tenantId,
      tipo: "DESPESA",
      data_competencia: dataCompetencia,
      valor_total: valor,
      descricao,
      criado_por: user.id,
    })
    .select("id")
    .single();

  if (erroEvento || !evento) {
    return { erro: erroEvento?.message ?? "Falha ao criar evento financeiro." };
  }

  const { error: erroRateio } = await supabase.from("rateio_categoria").insert({
    tenant_id: tenantId,
    evento_financeiro_id: evento.id,
    categoria_id: categoriaId,
    valor,
  });

  if (erroRateio) return { erro: erroRateio.message };

  const { error: erroParcela } = await supabase.from("parcelas").insert({
    tenant_id: tenantId,
    evento_financeiro_id: evento.id,
    numero: 1,
    data_vencimento: dataVencimento,
    valor,
    status: "PENDENTE",
  });

  if (erroParcela) return { erro: erroParcela.message };

  // reconhecimento contábil no regime de competência: Débito em Despesas
  // (a conta ligada à categoria), Crédito em Contas a Pagar — a saída de
  // caixa de verdade só vira lançamento quando a parcela for baixada (paga).
  const resultadoLancamento = await registrarLancamento(supabase, {
    tenant_id: tenantId,
    data_competencia: dataCompetencia,
    descricao,
    origem: "MANUAL",
    referencia_id: evento.id,
    criado_por: user.id,
    partidas: [
      { conta_contabil_id: categoria.conta_contabil_id, tipo: "DEBITO", valor },
      { conta_contabil_id: contaAPagar.id, tipo: "CREDITO", valor },
    ],
  });

  if ("erro" in resultadoLancamento) {
    return { erro: resultadoLancamento.erro };
  }

  revalidatePath("/despesas");
  return { sucesso: true };
}
