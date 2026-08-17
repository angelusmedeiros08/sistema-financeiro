"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { registrarBaixa } from "@/lib/contabil/baixa";
import { criarEventoFinanceiro } from "@/lib/contabil/evento-financeiro";
import { calcularChaveDedup, type TipoExtratoLinha } from "@/lib/conciliacao/parse";
import { buscarCandidatosConciliacao, classificarCorrespondencia, type CandidatoConciliacao, type TipoCorrespondenciaConciliacao } from "@/lib/conciliacao/matching";
import { buscarRegraPorDescricao, criarRegraSeNaoExiste } from "@/lib/conciliacao/regras";

export type LinhaParaImportar = {
  data: string;
  valor: number;
  tipo: TipoExtratoLinha;
  descricao: string;
  fitid: string | null;
};

export async function importarExtratoAction(
  contaFinanceiraId: string,
  linhas: LinhaParaImportar[],
): Promise<{ inseridas: number; puladas: number } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };
  if (linhas.length === 0) return { inseridas: 0, puladas: 0 };

  const supabase = await createClient();

  const linhasParaInserir = linhas.map((l) => ({
    tenant_id: contexto.tenantId,
    conta_financeira_id: contaFinanceiraId,
    data: l.data,
    valor: l.valor,
    tipo: l.tipo,
    descricao: l.descricao,
    fitid: l.fitid,
    chave_dedup: calcularChaveDedup(l),
  }));

  // Reimportar o mesmo extrato pula linha repetida em silêncio — o conflito
  // é detectado por chave_dedup (cobre CSV e OFX; FITID tem seu próprio
  // índice único à parte, ver migration).
  const { data, error } = await supabase
    .from("extrato_linhas")
    .upsert(linhasParaInserir, { onConflict: "tenant_id,conta_financeira_id,chave_dedup", ignoreDuplicates: true })
    .select("id");

  if (error) return { erro: error.message };

  const inseridas = data?.length ?? 0;
  return { inseridas, puladas: linhas.length - inseridas };
}

export type LinhaConciliacao = {
  id: string;
  data: string;
  valor: number;
  tipo: TipoExtratoLinha;
  descricao: string;
  candidatos: CandidatoConciliacao[];
  correspondencia: TipoCorrespondenciaConciliacao;
  regraSugerida: { categoriaId: string; pessoaId: string | null } | null;
};

// Roda uma busca de candidatos por linha pendente — volume esperado é de
// dezenas de linhas por sessão de conciliação (não milhares), então não
// compensa a complexidade de uma consulta batelada única.
export async function buscarLinhasParaConciliarAction(contaFinanceiraId: string): Promise<LinhaConciliacao[] | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();

  const { data: linhas, error } = await supabase
    .from("extrato_linhas")
    .select("id, data, valor, tipo, descricao")
    .eq("tenant_id", contexto.tenantId)
    .eq("conta_financeira_id", contaFinanceiraId)
    .eq("status", "PENDENTE")
    .order("data");

  if (error) return { erro: error.message };

  const resultado: LinhaConciliacao[] = [];
  for (const linha of linhas ?? []) {
    const valorLinha = Number(linha.valor);
    const [candidatos, regraSugerida] = await Promise.all([
      buscarCandidatosConciliacao(supabase, {
        tenantId: contexto.tenantId,
        contaFinanceiraId,
        data: linha.data,
        valor: valorLinha,
        tipo: linha.tipo,
      }),
      buscarRegraPorDescricao(supabase, contexto.tenantId, linha.descricao),
    ]);

    resultado.push({
      id: linha.id,
      data: linha.data,
      valor: valorLinha,
      tipo: linha.tipo,
      descricao: linha.descricao,
      candidatos,
      correspondencia: classificarCorrespondencia(candidatos, { data: linha.data, valor: valorLinha }),
      regraSugerida,
    });
  }

  return resultado;
}

export type CandidatoSelecionado = { chave: string; origem: "baixa" | "parcela"; id: string; valor: number };

export async function confirmarMatchAction(params: {
  extratoLinhaId: string;
  contaFinanceiraId: string;
  candidatos: CandidatoSelecionado[];
}): Promise<{ ok: true } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };
  if (params.candidatos.length === 0) return { erro: "Selecione ao menos um item pra conciliar." };

  const supabase = await createClient();

  const { data: linha, error: erroLinha } = await supabase
    .from("extrato_linhas")
    .select("data, valor, status")
    .eq("id", params.extratoLinhaId)
    .eq("tenant_id", contexto.tenantId)
    .single();
  if (erroLinha || !linha) return { erro: "Linha do extrato não encontrada." };
  if (linha.status !== "PENDENTE") return { erro: "Essa linha já foi conciliada ou ignorada." };

  // Nunca confia na soma calculada no cliente pra uma operação financeira —
  // revalida aqui antes de mexer em qualquer baixa.
  const somaSelecionada = params.candidatos.reduce((soma, c) => soma + c.valor, 0);
  if (Math.round((somaSelecionada - Number(linha.valor)) * 100) !== 0) {
    return { erro: "A soma dos itens selecionados não bate com o valor da linha do extrato." };
  }

  const baixaIds: string[] = [];
  for (const candidato of params.candidatos) {
    if (candidato.origem === "baixa") {
      baixaIds.push(candidato.id);
      continue;
    }

    // Parcela pendente selecionada pra agrupamento: confirmar o match já
    // registra a baixa de verdade, na conta sendo conciliada.
    const resultadoBaixa = await registrarBaixa(supabase, {
      tenant_id: contexto.tenantId,
      parcela_id: candidato.id,
      data_pagamento: linha.data,
      valor_pago: candidato.valor,
      conta_financeira_id: params.contaFinanceiraId,
      criado_por: contexto.user.id,
    });
    if ("erro" in resultadoBaixa) return { erro: `Baixa de uma das parcelas falhou: ${resultadoBaixa.erro}` };
    baixaIds.push(resultadoBaixa.baixa_id);
  }

  const { error: erroLink } = await supabase
    .from("extrato_linha_baixas")
    .insert(baixaIds.map((baixaId) => ({ extrato_linha_id: params.extratoLinhaId, baixa_id: baixaId, tenant_id: contexto.tenantId })));
  if (erroLink) return { erro: erroLink.message };

  const { error: erroStatus } = await supabase
    .from("extrato_linhas")
    .update({ status: "CONCILIADA" })
    .eq("id", params.extratoLinhaId)
    .eq("tenant_id", contexto.tenantId);
  if (erroStatus) return { erro: erroStatus.message };

  return { ok: true };
}

export async function criarLancamentoSimplificadoAction(params: {
  extratoLinhaId: string;
  contaFinanceiraId: string;
  categoriaId: string;
  pessoaId: string | null;
  descricao: string;
}): Promise<{ ok: true } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();

  const { data: linha, error: erroLinha } = await supabase
    .from("extrato_linhas")
    .select("data, valor, tipo, descricao, status")
    .eq("id", params.extratoLinhaId)
    .eq("tenant_id", contexto.tenantId)
    .single();
  if (erroLinha || !linha) return { erro: "Linha do extrato não encontrada." };
  if (linha.status !== "PENDENTE") return { erro: "Essa linha já foi conciliada ou ignorada." };

  const valorLinha = Number(linha.valor);
  const tipoEvento = linha.tipo === "CREDITO" ? "RECEITA" : "DESPESA";

  const resultadoEvento = await criarEventoFinanceiro(supabase, {
    tenant_id: contexto.tenantId,
    tipo: tipoEvento,
    descricao: params.descricao,
    valor_total: valorLinha,
    data_competencia: linha.data,
    categorias: [{ categoria_id: params.categoriaId, valor: valorLinha }],
    pessoa_id: params.pessoaId,
    numero_parcelas: 1,
    primeiro_vencimento: linha.data,
    criado_por: contexto.user.id,
  });
  if ("erro" in resultadoEvento) return resultadoEvento;

  const { data: parcela, error: erroParcela } = await supabase
    .from("parcelas")
    .select("id")
    .eq("evento_financeiro_id", resultadoEvento.evento_id)
    .eq("tenant_id", contexto.tenantId)
    .single();
  if (erroParcela || !parcela) return { erro: "Lançamento criado, mas a parcela não foi encontrada." };

  const resultadoBaixa = await registrarBaixa(supabase, {
    tenant_id: contexto.tenantId,
    parcela_id: parcela.id,
    data_pagamento: linha.data,
    valor_pago: valorLinha,
    conta_financeira_id: params.contaFinanceiraId,
    criado_por: contexto.user.id,
  });
  if ("erro" in resultadoBaixa) return { erro: `Lançamento criado, mas a baixa falhou: ${resultadoBaixa.erro}` };

  const { error: erroLink } = await supabase
    .from("extrato_linha_baixas")
    .insert({ extrato_linha_id: params.extratoLinhaId, baixa_id: resultadoBaixa.baixa_id, tenant_id: contexto.tenantId });
  if (erroLink) return { erro: erroLink.message };

  const { error: erroStatus } = await supabase
    .from("extrato_linhas")
    .update({ status: "CONCILIADA" })
    .eq("id", params.extratoLinhaId)
    .eq("tenant_id", contexto.tenantId);
  if (erroStatus) return { erro: erroStatus.message };

  // Nasce sozinha, sem nenhuma tela extra — próxima linha com a mesma
  // descrição já vem com a categoria pré-preenchida (Seção "Regras de
  // categorização automática" da spec).
  await criarRegraSeNaoExiste(supabase, {
    tenantId: contexto.tenantId,
    descricaoBanco: linha.descricao,
    categoriaId: params.categoriaId,
    pessoaId: params.pessoaId,
  });

  return { ok: true };
}

export async function ignorarLinhaExtratoAction(extratoLinhaId: string): Promise<{ ok: true } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const { error } = await supabase
    .from("extrato_linhas")
    .update({ status: "IGNORADA" })
    .eq("id", extratoLinhaId)
    .eq("tenant_id", contexto.tenantId)
    .eq("status", "PENDENTE");

  return error ? { erro: error.message } : { ok: true };
}

export async function revalidarPosConciliacaoAction(): Promise<void> {
  revalidatePath("/configuracoes/contas-financeiras");
  revalidatePath("/despesas");
  revalidatePath("/receitas");
  revalidatePath("/contas-a-pagar");
  revalidatePath("/contas-a-receber");
  revalidatePath("/painel");
}
