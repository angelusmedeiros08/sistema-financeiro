import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { registrarLancamento, type PartidaEntrada } from "./ledger";
import { hojeIsoBrasil } from "@/lib/data-brasil";

type Cliente = SupabaseClient<Database>;

// Reverte uma baixa por inteiro: nunca edita nada existente — cria um
// lançamento novo com as mesmas partidas invertidas (débito vira crédito e
// vice-versa) e só então marca a baixa original como estornada, pra ela
// parar de contar nos cálculos de status/saldo residual.
export async function estornarBaixa(
  supabase: Cliente,
  params: { tenant_id: string; baixa_id: string; criado_por?: string },
): Promise<{ sucesso: true } | { erro: string }> {
  const { data: baixa, error: erroBaixa } = await supabase
    .from("baixas")
    .select("id, lancamento_id, estornado_em, data_pagamento")
    .eq("id", params.baixa_id)
    .eq("tenant_id", params.tenant_id)
    .single();

  if (erroBaixa || !baixa) {
    return { erro: "Baixa não encontrada." };
  }
  if (baixa.estornado_em) {
    return { erro: "Essa baixa já foi estornada." };
  }
  if (!baixa.lancamento_id) {
    return { erro: "Baixa sem lançamento contábil associado, não é possível estornar." };
  }

  const { data: lancamentoOriginal, error: erroLancamento } = await supabase
    .from("lancamentos")
    .select("id, descricao")
    .eq("id", baixa.lancamento_id)
    .eq("tenant_id", params.tenant_id)
    .single();

  if (erroLancamento || !lancamentoOriginal) {
    return { erro: "Lançamento original não encontrado." };
  }

  const { data: partidasOriginais, error: erroPartidas } = await supabase
    .from("partidas")
    .select("conta_contabil_id, tipo, valor")
    .eq("lancamento_id", lancamentoOriginal.id);

  if (erroPartidas || !partidasOriginais || partidasOriginais.length === 0) {
    return { erro: "Partidas do lançamento original não encontradas." };
  }

  // Reentrância: se uma tentativa anterior já criou o lançamento contrário
  // mas falhou antes de marcar estornado_em (mesma classe do bug 017 —
  // UPDATE bloqueado em silêncio pelo RLS —, já corrigido na policy, mas
  // qualquer outra causa de falha no passo final teria o mesmo efeito), uma
  // nova chamada não pode criar um SEGUNDO lançamento de estorno.
  const { data: estornoJaExiste } = await supabase.from("lancamentos").select("id").eq("estornado_de_id", lancamentoOriginal.id).maybeSingle();

  if (!estornoJaExiste) {
    const partidasInvertidas: PartidaEntrada[] = partidasOriginais.map((p) => ({
      conta_contabil_id: p.conta_contabil_id,
      tipo: p.tipo === "DEBITO" ? "CREDITO" : "DEBITO",
      valor: p.valor,
    }));

    const resultadoLancamento = await registrarLancamento(supabase, {
      tenant_id: params.tenant_id,
      data_competencia: hojeIsoBrasil(),
      descricao: `Estorno: ${lancamentoOriginal.descricao}`,
      origem: "ESTORNO",
      estornado_de_id: lancamentoOriginal.id,
      criado_por: params.criado_por,
      partidas: partidasInvertidas,
    });

    if ("erro" in resultadoLancamento) {
      return { erro: resultadoLancamento.erro };
    }
  }

  // WHERE estornado_em is null garante atomicidade contra estorno em
  // duplicidade — se outra requisição já tiver marcado, esta não encontra
  // nenhuma linha pra atualizar.
  const { data: atualizada, error: erroMarcar } = await supabase
    .from("baixas")
    .update({ estornado_em: new Date().toISOString() })
    .eq("id", params.baixa_id)
    .is("estornado_em", null)
    .select("id");

  if (erroMarcar || !atualizada || atualizada.length === 0) {
    return { erro: "Não foi possível marcar a baixa como estornada (já pode ter sido estornada em paralelo)." };
  }

  return { sucesso: true };
}

// Trava real é o trigger do banco (rejeita se a parcela tiver baixa válida)
// — esta função só propaga o erro dele com uma mensagem já pronta.
export async function cancelarParcela(
  supabase: Cliente,
  params: { tenant_id: string; parcela_id: string; motivo: string },
): Promise<{ sucesso: true } | { erro: string }> {
  const { data, error } = await supabase
    .from("parcelas")
    .update({ status: "CANCELADO", motivo_cancelamento: params.motivo })
    .eq("id", params.parcela_id)
    .eq("tenant_id", params.tenant_id)
    .select("id");

  if (error) {
    if (error.message.includes("já tem baixa registrada")) {
      return { erro: "Essa parcela já tem baixa registrada, estorne a baixa antes de cancelar." };
    }
    return { erro: error.message };
  }
  // Sem isso, um UPDATE bloqueado em silêncio (gotcha de RLS já
  // documentado neste projeto: 0 linhas, sem erro de SQL) retornava
  // sucesso mesmo com a parcela intocada (achado em revisão de código).
  if (!data || data.length === 0) return { erro: "Parcela não encontrada." };

  return { sucesso: true };
}

// Renegociação muda só a data de vencimento (nunca o valor — ver spec) e
// grava uma linha de histórico completo, nunca sobrescrevendo a anterior.
export async function renegociarParcela(
  supabase: Cliente,
  params: {
    tenant_id: string;
    parcela_id: string;
    nova_data_vencimento: string;
    motivo: string;
    criado_por?: string;
  },
): Promise<{ sucesso: true } | { erro: string }> {
  const { data: parcela, error: erroParcela } = await supabase
    .from("parcelas")
    .select("id, data_vencimento, status")
    .eq("id", params.parcela_id)
    .eq("tenant_id", params.tenant_id)
    .single();

  if (erroParcela || !parcela) {
    return { erro: "Parcela não encontrada." };
  }
  if (parcela.status === "QUITADO" || parcela.status === "CANCELADO") {
    return { erro: "Parcela quitada ou cancelada não pode ser renegociada." };
  }

  const { error: erroHistorico } = await supabase.from("renegociacoes").insert({
    tenant_id: params.tenant_id,
    parcela_id: params.parcela_id,
    data_vencimento_anterior: parcela.data_vencimento,
    data_vencimento_nova: params.nova_data_vencimento,
    motivo: params.motivo,
    criado_por: params.criado_por,
  });

  if (erroHistorico) return { erro: erroHistorico.message };

  const { data: parcelaAtualizada, error: erroUpdate } = await supabase
    .from("parcelas")
    .update({ data_vencimento: params.nova_data_vencimento, status: "RENEGOCIADO" })
    .eq("id", params.parcela_id)
    .eq("tenant_id", params.tenant_id)
    .select("id");

  if (erroUpdate) return { erro: erroUpdate.message };
  // O histórico em `renegociacoes` já foi gravado acima — sem checar
  // linhas afetadas aqui, um UPDATE bloqueado em silêncio (mesmo gotcha
  // de RLS já documentado no projeto) deixava o histórico dizendo
  // "renegociado" com a parcela real intocada (achado em revisão de código).
  if (!parcelaAtualizada || parcelaAtualizada.length === 0) return { erro: "Falha ao atualizar a parcela — nenhuma linha foi alterada." };

  return { sucesso: true };
}
