import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Database } from "@/utils/supabase/database.types";
import { estornarEventoFinanceiro } from "@/lib/contabil/evento-financeiro";

type Cliente = SupabaseClient<Database>;
type TipoEntidade = "categoria" | "centro_custo" | "forma_pagamento" | "pessoa";

const TABELA_POR_TIPO_ENTIDADE: Record<TipoEntidade, "categorias_financeiras" | "centros_custo" | "formas_pagamento" | "pessoas"> = {
  categoria: "categorias_financeiras",
  centro_custo: "centros_custo",
  forma_pagamento: "formas_pagamento",
  pessoa: "pessoas",
};

// Diferente do import de Pessoas, o lote financeiro nasce cedo — na
// abertura da etapa Cadastros, não só na execução — porque a criação de
// entidade (categoria/centro de custo/forma de pagamento/pessoa) acontece
// ali, antes de qualquer linha ser processada, e precisa de um
// importacao_id pra registrar proveniência (importacoes_entidades_criadas).
export async function iniciarImportacaoFinanceira(
  supabase: Cliente,
  params: { tenant_id: string; nome_arquivo: string; criado_por: string; total_linhas: number },
): Promise<{ importacao_id: string } | { erro: string }> {
  const { data, error } = await supabase
    .from("importacoes")
    .insert({
      tenant_id: params.tenant_id,
      tipo: "financeiro",
      nome_arquivo: params.nome_arquivo,
      criado_por: params.criado_por,
      total_linhas: params.total_linhas,
      status: "em_andamento",
    })
    .select("id")
    .single();

  if (error || !data) return { erro: error?.message ?? "Falha ao registrar a importação." };
  return { importacao_id: data.id };
}

export async function registrarEntidadeCriada(
  supabase: Cliente,
  params: { importacao_id: string; tenant_id: string; tipo_entidade: TipoEntidade; entidade_id: string },
): Promise<void> {
  await supabase.from("importacoes_entidades_criadas").insert({
    importacao_id: params.importacao_id,
    tenant_id: params.tenant_id,
    tipo_entidade: params.tipo_entidade,
    entidade_id: params.entidade_id,
  });
}

export async function registrarItemImportacaoFinanceira(
  supabase: Cliente,
  params: { importacao_id: string; tenant_id: string; linha_numero: number; status: "sucesso" | "erro"; evento_financeiro_id?: string | null; erro?: string | null },
): Promise<void> {
  await supabase.from("importacoes_itens").insert({
    importacao_id: params.importacao_id,
    tenant_id: params.tenant_id,
    linha_numero: params.linha_numero,
    acao: "criar",
    dados_normalizados: {},
    status: params.status,
    evento_financeiro_id: params.evento_financeiro_id ?? null,
    erro: params.erro ?? null,
  });
}

export async function finalizarImportacaoFinanceira(supabase: Cliente, params: { importacao_id: string }): Promise<void> {
  await supabase.from("importacoes").update({ status: "concluida" }).eq("id", params.importacao_id);
}

type ItemAReverter = { item_id: string; evento_id: string; descricao: string; valor: number };
type EntidadeClassificada = { tipo_entidade: TipoEntidade; entidade_id: string; nome: string };

export type PreviaDesfazerFinanceira = {
  aReverter: ItemAReverter[];
  protegidosPorBaixa: ItemAReverter[];
  protegidosPorModificacao: ItemAReverter[];
  entidadesARemover: EntidadeClassificada[];
  entidadesPreservadas: (EntidadeClassificada & { motivo: string })[];
};

// Só leitura — nenhuma mutação. Monta o mesmo diagnóstico que
// desfazerImportacaoFinanceira vai executar depois, pra mostrar antes de
// qualquer botão de confirmação real (Seção "Fluxo de desfazer" da spec).
export async function preverDesfazerImportacaoFinanceira(
  supabase: Cliente,
  params: { tenant_id: string; importacao_id: string },
): Promise<PreviaDesfazerFinanceira | { erro: string }> {
  const { data: itens, error: erroItens } = await supabase
    .from("importacoes_itens")
    .select("id, evento_financeiro_id")
    .eq("importacao_id", params.importacao_id)
    .eq("tenant_id", params.tenant_id)
    .eq("status", "sucesso")
    .eq("acao", "criar")
    .is("desfeito_em", null)
    .not("evento_financeiro_id", "is", null);

  if (erroItens || !itens) return { erro: erroItens?.message ?? "Falha ao consultar os itens da importação." };

  const eventoIds = itens.map((i) => i.evento_financeiro_id as string);
  const admin = createAdminClient();

  const aReverter: ItemAReverter[] = [];
  const protegidosPorBaixa: ItemAReverter[] = [];
  const protegidosPorModificacao: ItemAReverter[] = [];

  if (eventoIds.length > 0) {
    const { data: eventos } = await admin.from("eventos_financeiros").select("id, descricao, valor_total, criado_em, atualizado_em").in("id", eventoIds);
    const { data: parcelas } = await admin.from("parcelas").select("id, evento_financeiro_id, status, criado_em, atualizado_em").in("evento_financeiro_id", eventoIds);
    const parcelaIds = (parcelas ?? []).map((p) => p.id);
    const { data: baixasVivas } = parcelaIds.length > 0 ? await admin.from("baixas").select("parcela_id").in("parcela_id", parcelaIds).is("estornado_em", null) : { data: [] };

    const parcelaIdsComBaixa = new Set((baixasVivas ?? []).map((b) => b.parcela_id));
    const eventoIdsComBaixa = new Set((parcelas ?? []).filter((p) => parcelaIdsComBaixa.has(p.id)).map((p) => p.evento_financeiro_id));
    const eventoIdsModificados = new Set(
      (parcelas ?? []).filter((p) => p.atualizado_em !== p.criado_em).map((p) => p.evento_financeiro_id),
    );

    for (const item of itens) {
      const eventoId = item.evento_financeiro_id as string;
      const evento = eventos?.find((e) => e.id === eventoId);
      if (!evento) continue;

      const registro: ItemAReverter = { item_id: item.id, evento_id: eventoId, descricao: evento.descricao ?? "", valor: Number(evento.valor_total) };

      if (eventoIdsComBaixa.has(eventoId)) {
        protegidosPorBaixa.push(registro);
      } else if (eventoIdsModificados.has(eventoId) || evento.atualizado_em !== evento.criado_em) {
        protegidosPorModificacao.push(registro);
      } else {
        aReverter.push(registro);
      }
    }
  }

  // Entidades: "a remover" só se nenhum evento fora do conjunto revertível
  // desta importação (ou de fora dela) usa a entidade — checagem contra
  // eventos_financeiros/rateio_categoria/parcelas em todo o tenant, não só
  // deste lote.
  const { data: entidadesCriadas } = await supabase
    .from("importacoes_entidades_criadas")
    .select("tipo_entidade, entidade_id")
    .eq("importacao_id", params.importacao_id)
    .eq("tenant_id", params.tenant_id);

  const idsRevertidos = new Set(aReverter.map((r) => r.evento_id));
  const entidadesARemover: EntidadeClassificada[] = [];
  const entidadesPreservadas: (EntidadeClassificada & { motivo: string })[] = [];

  for (const e of entidadesCriadas ?? []) {
    const tipo = e.tipo_entidade as TipoEntidade;
    const usoFora = await verificarUsoEntidadeForaDoConjunto(admin, { tenant_id: params.tenant_id, tipo_entidade: tipo, entidade_id: e.entidade_id, eventoIdsIgnorados: idsRevertidos });
    const nome = await buscarNomeEntidade(admin, tipo, e.entidade_id);
    if (usoFora) {
      entidadesPreservadas.push({ tipo_entidade: tipo, entidade_id: e.entidade_id, nome, motivo: "em uso fora desta importação" });
    } else {
      entidadesARemover.push({ tipo_entidade: tipo, entidade_id: e.entidade_id, nome });
    }
  }

  return { aReverter, protegidosPorBaixa, protegidosPorModificacao, entidadesARemover, entidadesPreservadas };
}

async function buscarNomeEntidade(admin: ReturnType<typeof createAdminClient>, tipo: TipoEntidade, id: string): Promise<string> {
  const { data } = await admin.from(TABELA_POR_TIPO_ENTIDADE[tipo]).select("nome").eq("id", id).maybeSingle();
  return data?.nome ?? id;
}

async function verificarUsoEntidadeForaDoConjunto(
  admin: ReturnType<typeof createAdminClient>,
  params: { tenant_id: string; tipo_entidade: TipoEntidade; entidade_id: string; eventoIdsIgnorados: Set<string> },
): Promise<boolean> {
  if (params.tipo_entidade === "pessoa") {
    const { data } = await admin.from("eventos_financeiros").select("id").eq("tenant_id", params.tenant_id).eq("pessoa_id", params.entidade_id);
    return (data ?? []).some((e) => !params.eventoIdsIgnorados.has(e.id));
  }
  if (params.tipo_entidade === "categoria") {
    const { data } = await admin.from("rateio_categoria").select("evento_financeiro_id").eq("tenant_id", params.tenant_id).eq("categoria_id", params.entidade_id);
    return (data ?? []).some((r) => !params.eventoIdsIgnorados.has(r.evento_financeiro_id));
  }
  if (params.tipo_entidade === "centro_custo") {
    const { data } = await admin
      .from("rateio_centro_custo")
      .select("rateio_categoria_id, rateio_categoria!inner(evento_financeiro_id)")
      .eq("tenant_id", params.tenant_id)
      .eq("centro_custo_id", params.entidade_id);
    return (data ?? []).some((r) => !params.eventoIdsIgnorados.has((r.rateio_categoria as unknown as { evento_financeiro_id: string }).evento_financeiro_id));
  }
  // forma_pagamento: usada em baixas, não em eventos — qualquer baixa
  // vinculada já é "fora do conjunto" por definição (baixa nunca é criada
  // pela importação em si, só pelo usuário depois).
  const { data } = await admin.from("baixas").select("id").eq("tenant_id", params.tenant_id).eq("forma_pagamento_id", params.entidade_id).limit(1);
  return (data ?? []).length > 0;
}

export type ResultadoDesfazerFinanceira = {
  eventosRevertidos: number;
  eventosComErro: { evento_id: string; erro: string }[];
  entidadesRemovidas: number;
  entidadesComErro: { tipo_entidade: TipoEntidade; nome: string; erro: string }[];
};

// Assinatura estável da prévia — só os ids que decidem o que a execução vai
// tocar, ordenados. Usada só pra comparar "a prévia que o usuário confirmou"
// contra "a prévia recém-recalculada no servidor", nunca pra decidir o que
// executar (isso sempre vem da recém-recalculada, nunca do objeto do cliente).
function assinaturaPrevia(p: PreviaDesfazerFinanceira): string {
  const ids = (lista: { item_id?: string; entidade_id?: string }[]) =>
    lista
      .map((x) => x.item_id ?? x.entidade_id ?? "")
      .sort()
      .join(",");
  return [
    ids(p.aReverter),
    ids(p.protegidosPorBaixa),
    ids(p.protegidosPorModificacao),
    ids(p.entidadesARemover),
    ids(p.entidadesPreservadas),
  ].join("|");
}

// Executa o que a prévia classificou — mas nunca confia nos ids que o
// cliente mandou de volta: um payload adulterado (ou só uma aba velha,
// reaberta depois de outra ação ter mudado o estado) poderia apontar
// evento_id/entidade_id pra um registro qualquer do tenant que nada tem a
// ver com esta importação, e tanto estornarEventoFinanceiro quanto o DELETE
// de entidade (via admin client, bypassa RLS) executariam do mesmo jeito.
// Por isso a prévia é sempre recalculada aqui, no servidor, a partir só de
// `importacao_id`/`tenant_id` — o snapshot do cliente serve exclusivamente
// pra comparar (mesma assinatura = nada mudou desde que o usuário viu a
// tela) e decidir se a chamada segue ou é rejeitada; a lista de ids que
// realmente executa é sempre a recém-calculada, nunca a do cliente.
export async function desfazerImportacaoFinanceira(
  supabase: Cliente,
  params: { tenant_id: string; importacao_id: string; criado_por: string; previa: PreviaDesfazerFinanceira; incluirModificados: boolean },
): Promise<ResultadoDesfazerFinanceira | { erro: string }> {
  const previaAtual = await preverDesfazerImportacaoFinanceira(supabase, { tenant_id: params.tenant_id, importacao_id: params.importacao_id });
  if ("erro" in previaAtual) return previaAtual;

  if (assinaturaPrevia(previaAtual) !== assinaturaPrevia(params.previa)) {
    return { erro: "A importação mudou desde a última verificação — recarregue a prévia e confirme de novo." };
  }

  const idsPuros = new Set(previaAtual.aReverter.map((a) => a.item_id));
  const itensParaReverter = params.incluirModificados ? [...previaAtual.aReverter, ...previaAtual.protegidosPorModificacao] : previaAtual.aReverter;

  const admin = createAdminClient();
  let eventosRevertidos = 0;
  const eventosComErro: { evento_id: string; erro: string }[] = [];

  for (const item of itensParaReverter) {
    const resultado = await estornarEventoFinanceiro(supabase, {
      tenant_id: params.tenant_id,
      evento_id: item.evento_id,
      motivo: "Importação desfeita",
      criado_por: params.criado_por,
    });
    if ("erro" in resultado) {
      eventosComErro.push({ evento_id: item.evento_id, erro: resultado.erro });
      continue;
    }
    eventosRevertidos++;

    // Item "puro" (sem baixa, sem modificação desde a criação): o efeito
    // contábil já ficou permanentemente registrado no razão imutável
    // (lançamento original + estorno) — o "stub" operacional (evento/parcela/
    // rateio) pode ser apagado de verdade, o que também libera os cadastros
    // criados só por ele. Item incluído por "incluir modificados" mantém o
    // stub como registro auditável, porque alguém mexeu nele depois da importação.
    let eventoFinanceiroIdFinal: string | null = item.evento_id;
    if (idsPuros.has(item.item_id)) {
      await supabase.from("importacoes_itens").update({ evento_financeiro_id: null }).eq("id", item.item_id);
      const { error: erroExclusao } = await admin.from("eventos_financeiros").delete().eq("id", item.evento_id).eq("tenant_id", params.tenant_id);
      eventoFinanceiroIdFinal = erroExclusao ? item.evento_id : null;
    }

    await supabase
      .from("importacoes_itens")
      .update({ desfeito_em: new Date().toISOString(), evento_financeiro_id: eventoFinanceiroIdFinal })
      .eq("id", item.item_id);
  }

  // Entidades sem policy de DELETE de propósito (mesmo padrão de
  // desfazerImportacao de Pessoas) — admin client só pra este DELETE
  // estreito, guardado pela prévia recém-recalculada, não por uma policy geral.
  let entidadesRemovidas = 0;
  const entidadesComErro: { tipo_entidade: TipoEntidade; nome: string; erro: string }[] = [];
  for (const e of previaAtual.entidadesARemover) {
    const { error } = await admin.from(TABELA_POR_TIPO_ENTIDADE[e.tipo_entidade]).delete().eq("id", e.entidade_id).eq("tenant_id", params.tenant_id);
    if (error) {
      entidadesComErro.push({ tipo_entidade: e.tipo_entidade, nome: e.nome, erro: error.message });
    } else {
      entidadesRemovidas++;
    }
  }

  await finalizarImportacaoFinanceira(supabase, { importacao_id: params.importacao_id });

  return { eventosRevertidos, eventosComErro, entidadesRemovidas, entidadesComErro };
}
