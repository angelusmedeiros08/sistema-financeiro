import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Database, Json } from "@/utils/supabase/database.types";
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

// Um item "pendente" por linha, criado ANTES de qualquer commit rodar —
// mesmo padrão que o import de Pessoas já usa (ver iniciarImportacao em
// importacoes.ts). Sem isso, uma linha nunca tentada (por queda do
// servidor no meio do loop) simplesmente não existe em importacoes_itens,
// escondendo quanto ficou faltando; e sem `dados_normalizados` guardando o
// dado real da linha (não mais `{}`), não tem como reprocessar depois —
// os dois eram os dois motivos do Retomar estar quebrado pro financeiro
// (ver spec 2026-08-26-importacao-execucao-servidor).
export async function registrarItensPendentesFinanceira(
  supabase: Cliente,
  params: { importacao_id: string; tenant_id: string; linhas: { linha_numero: number; dados: Json }[] },
): Promise<{ itensPorLinha: Record<number, string> } | { erro: string }> {
  const { data, error } = await supabase
    .from("importacoes_itens")
    .insert(
      params.linhas.map((l) => ({
        importacao_id: params.importacao_id,
        tenant_id: params.tenant_id,
        linha_numero: l.linha_numero,
        acao: "criar" as const,
        dados_normalizados: l.dados,
        status: "pendente" as const,
      })),
    )
    .select("id, linha_numero");

  if (error || !data) return { erro: error?.message ?? "Falha ao registrar as linhas da importação." };

  const itensPorLinha: Record<number, string> = {};
  for (const item of data) itensPorLinha[item.linha_numero] = item.id;
  return { itensPorLinha };
}

// Propaga erro de UPDATE (em vez de void) — mesmo padrão de
// atualizarItemImportacao (importacoes.ts). Sem isso, um UPDATE que falhar
// silenciosamente (ex.: policy de RLS faltando, gotcha recorrente já
// documentado neste projeto) deixaria o item preso em "pendente" sem
// nenhum sinal de que algo deu errado (achado em revisão de código).
export async function atualizarItemImportacaoFinanceira(
  supabase: Cliente,
  params: {
    tenant_id: string;
    item_id: string;
    status: "sucesso" | "erro";
    evento_financeiro_id?: string | null;
    erro?: string | null;
  },
): Promise<{ sucesso: true } | { erro: string }> {
  const { error } = await supabase
    .from("importacoes_itens")
    .update({
      status: params.status,
      evento_financeiro_id: params.evento_financeiro_id ?? null,
      erro: params.erro ?? null,
    })
    .eq("id", params.item_id)
    .eq("tenant_id", params.tenant_id);

  if (error) return { erro: error.message };
  return { sucesso: true };
}

export async function finalizarImportacaoFinanceira(supabase: Cliente, params: { importacao_id: string }): Promise<void> {
  // processando_desde: null libera o lock de reivindicarProcessamento
  // (importacoes.ts) — sem isso o lote ficaria bloqueado pra um novo
  // Retomar até a janela de 10 minutos expirar mesmo já tendo terminado.
  await supabase.from("importacoes").update({ status: "concluida", processando_desde: null }).eq("id", params.importacao_id);
}

type ItemAReverter = { item_id: string; evento_id: string; descricao: string; valor: number };
type EntidadeClassificada = { tipo_entidade: TipoEntidade; entidade_id: string; nome: string };

export type PreviaDesfazerFinanceira = {
  aReverter: ItemAReverter[];
  // Subconjunto de aReverter — só informativo, pra avisar o operador que
  // esses já estavam quitados e a baixa/recebimento também vai ser
  // desfeita junto. Nunca bloqueia: desfazer importação reverte por
  // completo, quitado ou não (ver pedido do usuário — reversão precisa
  // valer independente de status de pagamento e refletir em todo relatório
  // e indicador que olha pro razão).
  comBaixaRevertida: ItemAReverter[];
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
    .select("id, evento_financeiro_id, criado_em")
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
  const comBaixaRevertida: ItemAReverter[] = [];
  const protegidosPorModificacao: ItemAReverter[] = [];

  if (eventoIds.length > 0) {
    const { data: eventos } = await admin.from("eventos_financeiros").select("id, descricao, valor_total, criado_em, atualizado_em").in("id", eventoIds);
    const { data: parcelas } = await admin.from("parcelas").select("id, evento_financeiro_id, status, criado_em, atualizado_em").in("evento_financeiro_id", eventoIds);
    const parcelaIds = (parcelas ?? []).map((p) => p.id);
    const { data: baixasVivas } = parcelaIds.length > 0 ? await admin.from("baixas").select("parcela_id").in("parcela_id", parcelaIds).is("estornado_em", null) : { data: [] };

    const parcelaIdsComBaixa = new Set((baixasVivas ?? []).map((b) => b.parcela_id));
    const eventoIdsComBaixa = new Set((parcelas ?? []).filter((p) => parcelaIdsComBaixa.has(p.id)).map((p) => p.evento_financeiro_id));

    for (const item of itens) {
      const eventoId = item.evento_financeiro_id as string;
      const evento = eventos?.find((e) => e.id === eventoId);
      if (!evento) continue;

      const registro: ItemAReverter = { item_id: item.id, evento_id: eventoId, descricao: evento.descricao ?? "", valor: Number(evento.valor_total) };

      // "Modificado" só conta o que aconteceu DEPOIS que este item foi
      // registrado como importado com sucesso — nunca antes. A baixa
      // automática de "Data de pagamento" (commitarLinhaImportacao) já
      // atualiza a parcela ANTES desse registro (mesmo commit da linha),
      // então nunca entra como modificação alheia à própria importação.
      // Sem essa referência, toda linha com baixa automática caía em
      // "modificado" só por causa do próprio timestamp do import (achado
      // testando ao vivo — nenhum item quitado por planilha conseguia ser
      // revertido sem o checkbox "incluir modificados", mesmo sem ninguém
      // ter tocado nele depois). Baixa (quitado ou parcial) em si não
      // protege mais contra reversão — só modificação humana genuína
      // protege, porque preserva uma correção deliberada do operador.
      const itemCriadoEm = new Date(item.criado_em).getTime();
      const parcelasDoEvento = (parcelas ?? []).filter((p) => p.evento_financeiro_id === eventoId);
      const modificadoDepoisDoImport =
        new Date(evento.atualizado_em).getTime() > itemCriadoEm || parcelasDoEvento.some((p) => new Date(p.atualizado_em).getTime() > itemCriadoEm);

      if (modificadoDepoisDoImport) {
        protegidosPorModificacao.push(registro);
      } else {
        aReverter.push(registro);
        if (eventoIdsComBaixa.has(eventoId)) comBaixaRevertida.push(registro);
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

  // Em lote (1 consulta por tipo de entidade, não 1 por entidade) — com uma
  // importação grande (dezenas de categorias/pessoas/centros de custo
  // criados), o loop antigo fazia 2 round-trips sequenciais POR entidade
  // (nome + verificação de uso), e a tela de prévia ficava travada no
  // esqueleto de carregamento por vários segundos esperando isso terminar
  // um de cada vez (achado testando ao vivo com uma planilha real de 61
  // cadastros).
  const listaEntidades = (entidadesCriadas ?? []).map((e) => ({ tipo_entidade: e.tipo_entidade as TipoEntidade, entidade_id: e.entidade_id }));
  const [nomePorChave, usadasForaPorChave] = await Promise.all([
    buscarNomesEmLote(admin, listaEntidades),
    verificarUsoForaDoConjuntoEmLote(admin, { tenant_id: params.tenant_id, entidades: listaEntidades, eventoIdsIgnorados: idsRevertidos }),
  ]);

  for (const e of listaEntidades) {
    const chave = chaveEntidade(e.tipo_entidade, e.entidade_id);
    const nome = nomePorChave.get(chave) ?? e.entidade_id;
    if (usadasForaPorChave.has(chave)) {
      entidadesPreservadas.push({ tipo_entidade: e.tipo_entidade, entidade_id: e.entidade_id, nome, motivo: "em uso fora desta importação" });
    } else {
      entidadesARemover.push({ tipo_entidade: e.tipo_entidade, entidade_id: e.entidade_id, nome });
    }
  }

  return { aReverter, comBaixaRevertida, protegidosPorModificacao, entidadesARemover, entidadesPreservadas };
}

// Chave composta tipo:id — evita colisão teórica entre um uuid de
// categoria e um de pessoa (tabelas diferentes, mas o mesmo Map serve as 4).
function chaveEntidade(tipo: TipoEntidade, id: string): string {
  return `${tipo}:${id}`;
}

async function buscarNomesEmLote(
  admin: ReturnType<typeof createAdminClient>,
  entidades: { tipo_entidade: TipoEntidade; entidade_id: string }[],
): Promise<Map<string, string>> {
  const idsPorTipo = new Map<TipoEntidade, string[]>();
  for (const e of entidades) {
    const lista = idsPorTipo.get(e.tipo_entidade) ?? [];
    lista.push(e.entidade_id);
    idsPorTipo.set(e.tipo_entidade, lista);
  }

  const nomePorChave = new Map<string, string>();
  await Promise.all(
    Array.from(idsPorTipo.entries()).map(async ([tipo, ids]) => {
      const { data } = await admin.from(TABELA_POR_TIPO_ENTIDADE[tipo]).select("id, nome").in("id", ids);
      for (const row of data ?? []) nomePorChave.set(chaveEntidade(tipo, row.id), row.nome);
    }),
  );
  return nomePorChave;
}

// forma_pagamento: usada em baixas, não em eventos — qualquer baixa
// vinculada já é "fora do conjunto" por definição (baixa nunca é criada
// pela importação em si, só pelo usuário depois) — por isso não filtra por
// eventoIdsIgnorados como os outros 3 tipos.
async function verificarUsoForaDoConjuntoEmLote(
  admin: ReturnType<typeof createAdminClient>,
  params: { tenant_id: string; entidades: { tipo_entidade: TipoEntidade; entidade_id: string }[]; eventoIdsIgnorados: Set<string> },
): Promise<Set<string>> {
  const idsPorTipo = new Map<TipoEntidade, string[]>();
  for (const e of params.entidades) {
    const lista = idsPorTipo.get(e.tipo_entidade) ?? [];
    lista.push(e.entidade_id);
    idsPorTipo.set(e.tipo_entidade, lista);
  }

  const usadasFora = new Set<string>();
  const tarefas: Promise<void>[] = [];

  const idsPessoa = idsPorTipo.get("pessoa");
  if (idsPessoa) {
    tarefas.push(
      (async () => {
        const { data } = await admin.from("eventos_financeiros").select("id, pessoa_id").eq("tenant_id", params.tenant_id).in("pessoa_id", idsPessoa);
        for (const e of data ?? []) {
          if (e.pessoa_id && !params.eventoIdsIgnorados.has(e.id)) usadasFora.add(chaveEntidade("pessoa", e.pessoa_id));
        }
      })(),
    );
  }

  const idsCategoria = idsPorTipo.get("categoria");
  if (idsCategoria) {
    tarefas.push(
      (async () => {
        const { data } = await admin
          .from("rateio_categoria")
          .select("categoria_id, evento_financeiro_id")
          .eq("tenant_id", params.tenant_id)
          .in("categoria_id", idsCategoria);
        for (const r of data ?? []) {
          if (!params.eventoIdsIgnorados.has(r.evento_financeiro_id)) usadasFora.add(chaveEntidade("categoria", r.categoria_id));
        }
      })(),
    );
  }

  const idsCentroCusto = idsPorTipo.get("centro_custo");
  if (idsCentroCusto) {
    tarefas.push(
      (async () => {
        const { data } = await admin
          .from("rateio_centro_custo")
          .select("centro_custo_id, rateio_categoria!inner(evento_financeiro_id)")
          .eq("tenant_id", params.tenant_id)
          .in("centro_custo_id", idsCentroCusto);
        for (const r of data ?? []) {
          const eventoId = (r.rateio_categoria as unknown as { evento_financeiro_id: string }).evento_financeiro_id;
          if (r.centro_custo_id && !params.eventoIdsIgnorados.has(eventoId)) usadasFora.add(chaveEntidade("centro_custo", r.centro_custo_id));
        }
      })(),
    );
  }

  const idsFormaPagamento = idsPorTipo.get("forma_pagamento");
  if (idsFormaPagamento) {
    tarefas.push(
      (async () => {
        const { data } = await admin.from("baixas").select("forma_pagamento_id").eq("tenant_id", params.tenant_id).in("forma_pagamento_id", idsFormaPagamento);
        for (const b of data ?? []) {
          if (b.forma_pagamento_id) usadasFora.add(chaveEntidade("forma_pagamento", b.forma_pagamento_id));
        }
      })(),
    );
  }

  await Promise.all(tarefas);
  return usadasFora;
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
    ids(p.comBaixaRevertida),
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
      // Desfazer importação é reversão total por definição — quitado ou
      // não, a baixa também precisa sumir do razão pra relatório e
      // indicador pararem de contar um recebimento/pagamento cujo evento
      // de origem não existe mais.
      estornarBaixasAutomaticamente: true,
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
      .update({ desfeito_em: new Date().toISOString(), desfeito_por: params.criado_por, evento_financeiro_id: eventoFinanceiroIdFinal })
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
