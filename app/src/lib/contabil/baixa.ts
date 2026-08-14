import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { registrarLancamento, type PartidaEntrada } from "./ledger";
import {
  CODIGO_CAIXA_E_BANCOS,
  CODIGO_CONTAS_A_RECEBER,
  CODIGO_CONTAS_A_PAGAR,
  CODIGO_RECEITAS_FINANCEIRAS,
  CODIGO_DESPESAS_FINANCEIRAS,
  CODIGO_DESCONTOS_OBTIDOS,
  CODIGO_DESCONTOS_CONCEDIDOS,
} from "./plano-padrao";

type Cliente = SupabaseClient<Database>;

export type ParametrosBaixa = {
  tenant_id: string;
  parcela_id: string;
  data_pagamento: string;
  valor_pago: number;
  valor_juros?: number;
  valor_multa?: number;
  valor_desconto?: number;
  valor_taxa?: number;
  conta_financeira_id: string;
  metodo_pagamento?: string;
  criado_por?: string;
};

// Dá baixa (total ou parcial) numa parcela: monta o lançamento contábil com
// a composição de valor (principal + juros/multa + desconto + taxa) e grava
// o registro de baixa. O status da parcela é recalculado por trigger no
// banco a partir da soma das baixas — esta função nunca escreve status.
//
// Regra de sinal, consistente nas duas direções: juros/multa e desconto são
// sempre contrapartida de quem deve (receita nossa ou custo nosso conforme o
// caso); taxa é sempre custo nosso (Despesas Financeiras), em qualquer
// direção — é o banco/gateway cobrando pela movimentação, não o contato.
export async function registrarBaixa(
  supabase: Cliente,
  params: ParametrosBaixa,
): Promise<{ baixa_id: string } | { erro: string }> {
  const juros = params.valor_juros ?? 0;
  const multa = params.valor_multa ?? 0;
  const desconto = params.valor_desconto ?? 0;
  const taxa = params.valor_taxa ?? 0;

  const { data: parcela, error: erroParcela } = await supabase
    .from("parcelas")
    .select("id, valor, evento_financeiro_id, eventos_financeiros(tipo, descricao)")
    .eq("id", params.parcela_id)
    .eq("tenant_id", params.tenant_id)
    .single();

  if (erroParcela || !parcela) {
    return { erro: "Parcela não encontrada." };
  }

  const tipoEvento = parcela.eventos_financeiros?.tipo;
  if (!tipoEvento) {
    return { erro: "Evento financeiro da parcela não encontrado." };
  }

  const { data: contaFinanceira, error: erroContaFinanceira } = await supabase
    .from("contas_financeiras")
    .select("conta_contabil_id")
    .eq("id", params.conta_financeira_id)
    .eq("tenant_id", params.tenant_id)
    .single();

  if (erroContaFinanceira || !contaFinanceira?.conta_contabil_id) {
    return { erro: "Conta financeira inválida." };
  }

  const codigosNecessarios = [
    CODIGO_CAIXA_E_BANCOS,
    tipoEvento === "RECEITA" ? CODIGO_CONTAS_A_RECEBER : CODIGO_CONTAS_A_PAGAR,
    CODIGO_RECEITAS_FINANCEIRAS,
    CODIGO_DESPESAS_FINANCEIRAS,
    CODIGO_DESCONTOS_OBTIDOS,
    CODIGO_DESCONTOS_CONCEDIDOS,
  ];

  const { data: contas, error: erroContas } = await supabase
    .from("contas_contabeis")
    .select("id, codigo")
    .eq("tenant_id", params.tenant_id)
    .in("codigo", codigosNecessarios);

  if (erroContas || !contas) {
    return { erro: "Falha ao carregar plano de contas." };
  }

  const contaPorCodigo = new Map(contas.map((c) => [c.codigo, c.id]));
  const contaContraparte = contaPorCodigo.get(
    tipoEvento === "RECEITA" ? CODIGO_CONTAS_A_RECEBER : CODIGO_CONTAS_A_PAGAR,
  );
  const contaReceitasFinanceiras = contaPorCodigo.get(CODIGO_RECEITAS_FINANCEIRAS);
  const contaDespesasFinanceiras = contaPorCodigo.get(CODIGO_DESPESAS_FINANCEIRAS);
  const contaDescontosObtidos = contaPorCodigo.get(CODIGO_DESCONTOS_OBTIDOS);
  const contaDescontosConcedidos = contaPorCodigo.get(CODIGO_DESCONTOS_CONCEDIDOS);

  if (!contaContraparte || !contaReceitasFinanceiras || !contaDespesasFinanceiras || !contaDescontosObtidos || !contaDescontosConcedidos) {
    return { erro: "Plano de contas incompleto para registrar baixa: contas de sistema ausentes." };
  }

  const partidas: PartidaEntrada[] = [];

  if (tipoEvento === "RECEITA") {
    const valorCaixa = params.valor_pago + juros + multa - desconto - taxa;
    if (valorCaixa <= 0) {
      return { erro: "O valor líquido recebido precisa ser maior que zero." };
    }
    partidas.push({ conta_contabil_id: contaFinanceira.conta_contabil_id, tipo: "DEBITO", valor: valorCaixa });
    partidas.push({ conta_contabil_id: contaContraparte, tipo: "CREDITO", valor: params.valor_pago });
    if (juros + multa > 0) partidas.push({ conta_contabil_id: contaReceitasFinanceiras, tipo: "CREDITO", valor: juros + multa });
    if (desconto > 0) partidas.push({ conta_contabil_id: contaDescontosConcedidos, tipo: "DEBITO", valor: desconto });
    if (taxa > 0) partidas.push({ conta_contabil_id: contaDespesasFinanceiras, tipo: "DEBITO", valor: taxa });
  } else {
    const valorCaixa = params.valor_pago + juros + multa + taxa - desconto;
    if (valorCaixa <= 0) {
      return { erro: "O valor líquido pago precisa ser maior que zero." };
    }
    partidas.push({ conta_contabil_id: contaFinanceira.conta_contabil_id, tipo: "CREDITO", valor: valorCaixa });
    partidas.push({ conta_contabil_id: contaContraparte, tipo: "DEBITO", valor: params.valor_pago });
    if (juros + multa + taxa > 0) partidas.push({ conta_contabil_id: contaDespesasFinanceiras, tipo: "DEBITO", valor: juros + multa + taxa });
    if (desconto > 0) partidas.push({ conta_contabil_id: contaDescontosObtidos, tipo: "CREDITO", valor: desconto });
  }

  const resultadoLancamento = await registrarLancamento(supabase, {
    tenant_id: params.tenant_id,
    data_competencia: params.data_pagamento,
    descricao: `Baixa: ${parcela.eventos_financeiros?.descricao ?? "lançamento"}`,
    origem: "MANUAL",
    referencia_id: parcela.id,
    criado_por: params.criado_por,
    partidas,
  });

  if ("erro" in resultadoLancamento) {
    return { erro: resultadoLancamento.erro };
  }

  // a trava de saldo residual contra baixa acima do valor em aberto é
  // garantida por trigger no banco (constraint real), não por checagem aqui.
  const { data: baixa, error: erroBaixa } = await supabase
    .from("baixas")
    .insert({
      tenant_id: params.tenant_id,
      parcela_id: params.parcela_id,
      data_pagamento: params.data_pagamento,
      valor_pago: params.valor_pago,
      valor_juros: juros,
      valor_multa: multa,
      valor_desconto: desconto,
      valor_taxa: taxa,
      conta_financeira_id: params.conta_financeira_id,
      lancamento_id: resultadoLancamento.lancamento_id,
    })
    .select("id")
    .single();

  if (erroBaixa || !baixa) {
    return { erro: erroBaixa?.message ?? "Falha ao registrar baixa." };
  }

  // metodo_pagamento vive na parcela (não em cada baixa) — semântica de
  // "método usado por último", suficiente para esta fase sem parcela com
  // baixas mistas de método sendo um caso comum.
  if (params.metodo_pagamento) {
    await supabase
      .from("parcelas")
      .update({ metodo_pagamento: params.metodo_pagamento })
      .eq("id", params.parcela_id)
      .eq("tenant_id", params.tenant_id);
  }

  return { baixa_id: baixa.id };
}
