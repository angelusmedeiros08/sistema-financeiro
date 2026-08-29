import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import type { PartidaEntrada } from "./ledger";
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
  forma_pagamento_id?: string;
  criado_por?: string;
  // Gerada uma vez por sessão de formulário (crypto.randomUUID() no
  // client) — um reenvio com a MESMA chave (duplo clique, retry de rede)
  // devolve a baixa já criada em vez de duplicar o lançamento contábil.
  // Baixa integral, estorno e aprovar venda já tinham proteção equivalente
  // contra corrida (FOR UPDATE / guarda atômica); baixa parcial não tinha
  // nenhuma, porque o valor pago abaixo do saldo residual deixa duas
  // requisições concorrentes passarem pela trava de saldo com sucesso
  // (achado em auditoria de segurança, 29/08/2026).
  idempotency_key?: string;
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
    const valorCaixa = Math.round((params.valor_pago + juros + multa - desconto - taxa) * 100) / 100;
    if (valorCaixa <= 0) {
      return { erro: "O valor líquido recebido precisa ser maior que zero." };
    }
    partidas.push({ conta_contabil_id: contaFinanceira.conta_contabil_id, tipo: "DEBITO", valor: valorCaixa });
    partidas.push({ conta_contabil_id: contaContraparte, tipo: "CREDITO", valor: params.valor_pago });
    if (juros + multa > 0) partidas.push({ conta_contabil_id: contaReceitasFinanceiras, tipo: "CREDITO", valor: juros + multa });
    if (desconto > 0) partidas.push({ conta_contabil_id: contaDescontosConcedidos, tipo: "DEBITO", valor: desconto });
    if (taxa > 0) partidas.push({ conta_contabil_id: contaDespesasFinanceiras, tipo: "DEBITO", valor: taxa });
  } else {
    const valorCaixa = Math.round((params.valor_pago + juros + multa + taxa - desconto) * 100) / 100;
    if (valorCaixa <= 0) {
      return { erro: "O valor líquido pago precisa ser maior que zero." };
    }
    partidas.push({ conta_contabil_id: contaFinanceira.conta_contabil_id, tipo: "CREDITO", valor: valorCaixa });
    partidas.push({ conta_contabil_id: contaContraparte, tipo: "DEBITO", valor: params.valor_pago });
    if (juros + multa + taxa > 0) partidas.push({ conta_contabil_id: contaDespesasFinanceiras, tipo: "DEBITO", valor: juros + multa + taxa });
    if (desconto > 0) partidas.push({ conta_contabil_id: contaDescontosObtidos, tipo: "CREDITO", valor: desconto });
  }

  const somaDebito = partidas.filter((p) => p.tipo === "DEBITO").reduce((acc, p) => acc + p.valor, 0);
  const somaCredito = partidas.filter((p) => p.tipo === "CREDITO").reduce((acc, p) => acc + p.valor, 0);
  if (Math.round((somaDebito - somaCredito) * 100) !== 0) {
    return { erro: "Lançamento desbalanceado: débito e crédito não coincidem." };
  }

  // registrar_baixa (RPC) faz lançamento + partidas + baixa numa única
  // transação, e devolve a baixa já existente sem duplicar nada quando
  // idempotency_key repete — a trava de saldo residual contra baixa acima
  // do valor em aberto continua garantida por trigger no banco.
  const { data: baixaId, error: erroBaixa } = await supabase.rpc("registrar_baixa", {
    p_tenant_id: params.tenant_id,
    p_parcela_id: params.parcela_id,
    p_data_pagamento: params.data_pagamento,
    p_valor_pago: params.valor_pago,
    p_valor_juros: juros,
    p_valor_multa: multa,
    p_valor_desconto: desconto,
    p_valor_taxa: taxa,
    p_conta_financeira_id: params.conta_financeira_id,
    p_descricao: `Baixa: ${parcela.eventos_financeiros?.descricao ?? "lançamento"}`,
    p_partidas: partidas.map((p) => ({ conta_contabil_id: p.conta_contabil_id, tipo: p.tipo, valor: p.valor })),
    ...(params.forma_pagamento_id ? { p_forma_pagamento_id: params.forma_pagamento_id } : {}),
    ...(params.criado_por ? { p_criado_por: params.criado_por } : {}),
    ...(params.idempotency_key ? { p_idempotency_key: params.idempotency_key } : {}),
  });

  if (erroBaixa || !baixaId) {
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

  return { baixa_id: baixaId };
}

// Mesmo fluxo "criar na hora" já usado pra centro de custo/categoria/pessoa
// (evento-financeiro.ts): se veio um nome novo digitado (e nenhum ID), cria
// a forma de pagamento e escreve o ID de volta no FormData. Também devolve
// o nome (existente ou recém-criado) pra `darBaixa` manter
// `parcelas.metodo_pagamento` (texto, só de exibição) em sincronia sem
// precisar de uma segunda leitura.
export async function resolverFormaPagamentoIdSimples(
  supabase: Cliente,
  tenantId: string,
  formData: FormData,
): Promise<{ nome: string | null }> {
  const idExistente = String(formData.get("forma_pagamento_id") ?? "");
  if (idExistente) {
    const { data } = await supabase.from("formas_pagamento").select("nome").eq("id", idExistente).maybeSingle();
    return { nome: data?.nome ?? null };
  }

  const nomeNovo = String(formData.get("forma_pagamento_nome_novo") ?? "").trim();
  if (!nomeNovo) return { nome: null };

  const { data } = await supabase.from("formas_pagamento").insert({ tenant_id: tenantId, nome: nomeNovo }).select("id, nome").single();
  if (data?.id) formData.set("forma_pagamento_id", data.id);
  return { nome: data?.nome ?? null };
}
