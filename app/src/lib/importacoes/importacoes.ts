import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Database, Json } from "@/utils/supabase/database.types";
import { estornarEventoFinanceiro } from "@/lib/contabil/evento-financeiro";

type Cliente = SupabaseClient<Database>;
type TipoImportacao = Database["public"]["Enums"]["tipo_importacao"];
type StatusImportacao = Database["public"]["Enums"]["status_importacao"];
type StatusItemImportacao = Database["public"]["Enums"]["status_item_importacao"];
type AcaoItemImportacao = Database["public"]["Enums"]["acao_item_importacao"];

export type ResumoImportacao = {
  id: string;
  tipo: TipoImportacao;
  nomeArquivo: string;
  status: StatusImportacao;
  totalLinhas: number;
  criadoPorNome: string | null;
  criadoEm: string;
  sucessos: number;
  erros: number;
  pendentes: number;
};

export type ItemImportacao = {
  id: string;
  linhaNumero: number;
  status: StatusItemImportacao;
  acao: AcaoItemImportacao;
  pessoaId: string | null;
  erro: string | null;
  dadosNormalizados: Json;
  desfeitoEm: string | null;
  desfeitoPor: string | null;
};

// "Ativo" = criado com sucesso e ainda não desfeito — usado tanto na
// página de detalhe quanto na tela de desfazer (Estado 5: contagem 0 com
// item de sucesso existente = a importação inteira já foi revertida antes).
// Extraído pra função só depois de ficar duplicado nos dois lugares
// (achado ao escrever a tela dedicada de desfazer).
export function contarItensAtivos(itens: Pick<ItemImportacao, "status" | "acao" | "desfeitoEm">[]): number {
  return itens.filter((it) => it.acao === "criar" && it.status === "sucesso" && !it.desfeitoEm).length;
}

// Cria o lote e um item "pendente" por linha, na abertura do passo de
// execução — antes de qualquer commit rodar. É isso que dá rastro
// persistido ao progresso (em vez de só um useState que some se a aba
// fechar) e é o que permite cancelar/retomar depois.
export async function iniciarImportacao(
  supabase: Cliente,
  params: {
    tenant_id: string;
    tipo: TipoImportacao;
    nome_arquivo: string;
    criado_por: string;
    itens: { linha_numero: number; acao: AcaoItemImportacao; dados_normalizados: Json }[];
  },
): Promise<{ importacao_id: string; itens: { linha_numero: number; item_id: string }[] } | { erro: string }> {
  const { data: importacao, error: erroImportacao } = await supabase
    .from("importacoes")
    .insert({
      tenant_id: params.tenant_id,
      tipo: params.tipo,
      nome_arquivo: params.nome_arquivo,
      criado_por: params.criado_por,
      total_linhas: params.itens.length,
    })
    .select("id")
    .single();

  if (erroImportacao || !importacao) return { erro: erroImportacao?.message ?? "Falha ao registrar a importação." };

  const { data: itensCriados, error: erroItens } = await supabase
    .from("importacoes_itens")
    .insert(
      params.itens.map((i) => ({
        importacao_id: importacao.id,
        tenant_id: params.tenant_id,
        linha_numero: i.linha_numero,
        acao: i.acao,
        dados_normalizados: i.dados_normalizados,
      })),
    )
    .select("id, linha_numero");

  if (erroItens || !itensCriados) return { erro: erroItens?.message ?? "Falha ao registrar as linhas da importação." };

  return {
    importacao_id: importacao.id,
    itens: itensCriados.map((i) => ({ linha_numero: i.linha_numero, item_id: i.id })),
  };
}

// 10 minutos é bem mais que o tempo real de processar até 500 linhas
// (testado ao vivo: 40 linhas levaram poucos segundos) — folga generosa
// pra nunca confundir "ainda rodando de verdade" com "travou", mas curta
// o bastante pra uma queda real do servidor não deixar o lote inacessível
// por muito tempo.
const JANELA_PROCESSAMENTO_MS = 10 * 60 * 1000;

// Reivindica o direito de processar um lote — UPDATE condicional atômico:
// só marca `processando_desde` se ninguém mais estiver processando agora
// (campo nulo) ou se a marca anterior já passou da janela de segurança
// (sinal de queda real do servidor, não de execução em andamento). Sem
// isso, abrir o histórico numa segunda aba durante uma importação grande
// e clicar Retomar processaria as mesmas linhas em paralelo — achado em
// revisão de código: duplicaria baixa/recebimento no financeiro (
// registrarBaixa não é idempotente) e criaria cliente/fornecedor
// duplicado em Pessoas (sem dedup nenhum no caminho "criar"). Compartilhado
// entre os dois tipos de importação — a tabela `importacoes` é a mesma.
export async function reivindicarProcessamento(
  supabase: Cliente,
  params: { tenant_id: string; importacao_id: string },
): Promise<{ ok: true } | { erro: string }> {
  const limite = new Date(Date.now() - JANELA_PROCESSAMENTO_MS).toISOString();
  const { data, error } = await supabase
    .from("importacoes")
    .update({ processando_desde: new Date().toISOString() })
    .eq("id", params.importacao_id)
    .eq("tenant_id", params.tenant_id)
    .or(`processando_desde.is.null,processando_desde.lt.${limite}`)
    .select("id");

  if (error) return { erro: error.message };
  if (!data || data.length === 0) return { erro: "Esta importação já está sendo processada em outra aba ou sessão." };
  return { ok: true };
}

export async function atualizarItemImportacao(
  supabase: Cliente,
  params: { tenant_id: string; item_id: string; status: "sucesso" | "erro"; pessoa_id?: string | null; erro?: string | null },
): Promise<{ sucesso: true } | { erro: string }> {
  const { error } = await supabase
    .from("importacoes_itens")
    .update({ status: params.status, pessoa_id: params.pessoa_id ?? null, erro: params.erro ?? null })
    .eq("id", params.item_id)
    .eq("tenant_id", params.tenant_id);

  if (error) return { erro: error.message };
  return { sucesso: true };
}

export async function finalizarImportacao(
  supabase: Cliente,
  params: { importacao_id: string; status: "concluida" | "cancelada" },
): Promise<{ sucesso: true } | { erro: string }> {
  // Libera o lock de reivindicarProcessamento — sem isso, o lote ficaria
  // bloqueado pra um novo Retomar até a janela de 10 minutos expirar
  // mesmo depois de terminar com sucesso.
  const { error } = await supabase.from("importacoes").update({ status: params.status, processando_desde: null }).eq("id", params.importacao_id);
  if (error) return { erro: error.message };
  return { sucesso: true };
}

// Contagem por status agregada no Postgres (RPC contar_itens_importacao),
// em vez de buscar toda linha de importacoes_itens pro Node só pra contar —
// achado em auditoria de escalabilidade (30/08/2026): uma única importação
// de planilha histórica pode ter milhares de linhas, e antes desta troca
// TODAS voltavam a cada abertura da tela de histórico, só pra exibir 3
// números por importação.
export async function listarImportacoes(supabase: Cliente, tenant_id: string): Promise<ResumoImportacao[]> {
  const [{ data }, { data: contagens }] = await Promise.all([
    supabase
      .from("importacoes")
      .select("id, tipo, nome_arquivo, status, total_linhas, criado_em, usuarios(nome)")
      .eq("tenant_id", tenant_id)
      .order("criado_em", { ascending: false }),
    supabase.rpc("contar_itens_importacao", { p_tenant_id: tenant_id }),
  ]);

  const porImportacao = new Map<string, Record<StatusItemImportacao, number>>();
  for (const c of contagens ?? []) {
    const atual = porImportacao.get(c.importacao_id) ?? { pendente: 0, sucesso: 0, erro: 0 };
    atual[c.status as StatusItemImportacao] = Number(c.quantidade);
    porImportacao.set(c.importacao_id, atual);
  }

  return (data ?? []).map((i) => {
    const contagem = porImportacao.get(i.id) ?? { pendente: 0, sucesso: 0, erro: 0 };
    return {
      id: i.id,
      tipo: i.tipo,
      nomeArquivo: i.nome_arquivo,
      status: i.status,
      totalLinhas: i.total_linhas,
      criadoPorNome: i.usuarios?.nome ?? null,
      criadoEm: i.criado_em,
      sucessos: contagem.sucesso,
      erros: contagem.erro,
      pendentes: contagem.pendente,
    };
  });
}

export async function buscarImportacao(
  supabase: Cliente,
  params: { tenant_id: string; importacao_id: string },
): Promise<{ importacao: ResumoImportacao; itens: ItemImportacao[] } | null> {
  const { data: importacao } = await supabase
    .from("importacoes")
    .select("id, tipo, nome_arquivo, status, total_linhas, criado_em, usuarios(nome)")
    .eq("id", params.importacao_id)
    .eq("tenant_id", params.tenant_id)
    .maybeSingle();

  if (!importacao) return null;

  const { data: itens } = await supabase
    .from("importacoes_itens")
    .select("id, linha_numero, status, acao, pessoa_id, erro, dados_normalizados, desfeito_em, desfeito_por")
    .eq("importacao_id", params.importacao_id)
    .order("linha_numero");

  const listaItens = itens ?? [];
  return {
    importacao: {
      id: importacao.id,
      tipo: importacao.tipo,
      nomeArquivo: importacao.nome_arquivo,
      status: importacao.status,
      totalLinhas: importacao.total_linhas,
      criadoPorNome: importacao.usuarios?.nome ?? null,
      criadoEm: importacao.criado_em,
      sucessos: listaItens.filter((it) => it.status === "sucesso").length,
      erros: listaItens.filter((it) => it.status === "erro").length,
      pendentes: listaItens.filter((it) => it.status === "pendente").length,
    },
    itens: listaItens.map((it) => ({
      id: it.id,
      linhaNumero: it.linha_numero,
      status: it.status,
      acao: it.acao,
      pessoaId: it.pessoa_id,
      erro: it.erro,
      dadosNormalizados: it.dados_normalizados,
      desfeitoEm: it.desfeito_em,
      desfeitoPor: it.desfeito_por,
    })),
  };
}

// Itens que ainda precisam de uma tentativa: erro (falhou) ou pendente
// (nunca chegou a rodar — sobrou de um cancelamento). Os dados guardados em
// dados_normalizados são exatamente o que o commit original recebeu, então
// dá pra reenviar sem precisar do arquivo original de novo.
export async function buscarItensParaRetomar(
  supabase: Cliente,
  params: { tenant_id: string; importacao_id: string },
): Promise<ItemImportacao[]> {
  const { data } = await supabase
    .from("importacoes_itens")
    .select("id, linha_numero, status, acao, pessoa_id, erro, dados_normalizados, desfeito_em, desfeito_por")
    .eq("importacao_id", params.importacao_id)
    .eq("tenant_id", params.tenant_id)
    .in("status", ["erro", "pendente"])
    .order("linha_numero");

  return (data ?? []).map((it) => ({
    id: it.id,
    linhaNumero: it.linha_numero,
    status: it.status,
    acao: it.acao,
    pessoaId: it.pessoa_id,
    erro: it.erro,
    desfeitoEm: it.desfeito_em,
    desfeitoPor: it.desfeito_por,
    dadosNormalizados: it.dados_normalizados,
  }));
}

export async function marcarImportacaoRetomando(supabase: Cliente, params: { importacao_id: string }): Promise<void> {
  await supabase.from("importacoes").update({ status: "em_andamento" }).eq("id", params.importacao_id);
}

type EventoAReverter = { evento_id: string; pessoa_id: string; pessoa_nome: string; descricao: string; valor: number };
type PessoaProtegida = { pessoa_id: string; nome: string; motivo: string };

export type PreviaDesfazerImportacaoPessoas = {
  pessoasARemover: { pessoa_id: string; nome: string }[];
  // Subconjunto de pessoasARemover que tem lançamento vivo vinculado — a
  // remoção só acontece depois de estornar cada um destes.
  eventosAReverter: EventoAReverter[];
  protegidas: PessoaProtegida[];
};

// Só leitura — monta o mesmo diagnóstico que desfazerImportacaoPessoas vai
// executar depois, pra mostrar antes do botão de confirmação real (mesmo
// padrão de prévia+confirmar do desfazer financeiro).
export async function preverDesfazerImportacaoPessoas(
  supabase: Cliente,
  params: { tenant_id: string; importacao_id: string },
): Promise<PreviaDesfazerImportacaoPessoas | { erro: string }> {
  const { data: itensCriados, error: erroItens } = await supabase
    .from("importacoes_itens")
    .select("id, pessoa_id")
    .eq("importacao_id", params.importacao_id)
    .eq("tenant_id", params.tenant_id)
    .eq("status", "sucesso")
    .eq("acao", "criar")
    .is("desfeito_em", null)
    .not("pessoa_id", "is", null);

  if (erroItens || !itensCriados) return { erro: erroItens?.message ?? "Falha ao consultar os itens da importação." };
  if (itensCriados.length === 0) return { pessoasARemover: [], eventosAReverter: [], protegidas: [] };

  const pessoaIds = itensCriados.map((i) => i.pessoa_id as string);
  const admin = createAdminClient();

  const { data: pessoas } = await admin.from("pessoas").select("id, nome").in("id", pessoaIds);
  const nomePorId = new Map((pessoas ?? []).map((p) => [p.id, p.nome]));

  const { data: eventosVivos } = await admin
    .from("eventos_financeiros")
    .select("id, pessoa_id, descricao, valor_total")
    .in("pessoa_id", pessoaIds)
    .is("estornado_em", null);

  // As outras 4 formas de "em uso" nunca viram estorno neste fluxo — só
  // protegem, do jeito que lançamento também protegia antes deste ajuste.
  // Sem checar as 4, uma pessoa presa só por uma dessas (nenhuma tem
  // lançamento) passaria como "removível" e o DELETE quebraria com erro de
  // FK pra TODAS as pessoas do lote, não só essa (achado lendo o schema:
  // as 4 têm delete_rule NO ACTION).
  const [{ data: vendasVinculadas }, { data: regrasRecorrencia }, { data: regrasCategorizacao }, { data: usuariosVinculados }] = await Promise.all([
    admin.from("vendas").select("pessoa_id").in("pessoa_id", pessoaIds),
    admin.from("regras_recorrencia").select("pessoa_id").in("pessoa_id", pessoaIds),
    admin.from("regras_categorizacao").select("pessoa_id").in("pessoa_id", pessoaIds),
    admin.from("usuario_tenant").select("pessoa_id").in("pessoa_id", pessoaIds),
  ]);

  const idsComVenda = new Set((vendasVinculadas ?? []).map((v) => v.pessoa_id));
  const idsComRegraRecorrencia = new Set((regrasRecorrencia ?? []).map((r) => r.pessoa_id));
  const idsComRegraCategorizacao = new Set((regrasCategorizacao ?? []).map((r) => r.pessoa_id));
  const idsComUsuario = new Set((usuariosVinculados ?? []).map((u) => u.pessoa_id));

  const eventosPorPessoa = new Map<string, EventoAReverter[]>();
  for (const e of eventosVivos ?? []) {
    if (!e.pessoa_id) continue;
    const nome = nomePorId.get(e.pessoa_id) ?? e.pessoa_id;
    const lista = eventosPorPessoa.get(e.pessoa_id) ?? [];
    lista.push({ evento_id: e.id, pessoa_id: e.pessoa_id, pessoa_nome: nome, descricao: e.descricao ?? "", valor: Number(e.valor_total) });
    eventosPorPessoa.set(e.pessoa_id, lista);
  }

  const pessoasARemover: { pessoa_id: string; nome: string }[] = [];
  const eventosAReverter: EventoAReverter[] = [];
  const protegidas: PessoaProtegida[] = [];

  for (const id of pessoaIds) {
    const nome = nomePorId.get(id) ?? id;
    if (idsComVenda.has(id)) {
      protegidas.push({ pessoa_id: id, nome, motivo: "vinculada a uma venda" });
    } else if (idsComRegraRecorrencia.has(id)) {
      protegidas.push({ pessoa_id: id, nome, motivo: "vinculada a uma regra de recorrência" });
    } else if (idsComRegraCategorizacao.has(id)) {
      protegidas.push({ pessoa_id: id, nome, motivo: "vinculada a uma regra de categorização automática" });
    } else if (idsComUsuario.has(id)) {
      protegidas.push({ pessoa_id: id, nome, motivo: "vinculada a um usuário do sistema" });
    } else {
      pessoasARemover.push({ pessoa_id: id, nome });
      eventosAReverter.push(...(eventosPorPessoa.get(id) ?? []));
    }
  }

  return { pessoasARemover, eventosAReverter, protegidas };
}

function assinaturaPreviaPessoas(p: PreviaDesfazerImportacaoPessoas): string {
  const idsPessoa = (lista: { pessoa_id: string }[]) => lista.map((x) => x.pessoa_id).sort().join(",");
  const idsEvento = p.eventosAReverter
    .map((e) => e.evento_id)
    .sort()
    .join(",");
  return [idsPessoa(p.pessoasARemover), idsEvento, idsPessoa(p.protegidas)].join("|");
}

export type ResultadoDesfazerImportacaoPessoas = {
  removidas: number;
  eventosRevertidos: number;
  eventosComErro: { evento_id: string; erro: string }[];
  protegidas: PessoaProtegida[];
};

// Desfaz uma importação de Clientes/Fornecedores: apaga só as pessoas que
// ELA criou (nunca as que atualizou — não existe como desfazer um UPDATE
// sem saber o valor anterior). Lançamento financeiro vinculado deixou de
// proteger a pessoa em silêncio — agora é estornado primeiro (baixa
// incluída, mesmo modo do desfazer financeiro), não importa se veio de
// outra importação ou foi digitado à mão. Só venda, regra de recorrência,
// regra de categorização e vínculo de usuário continuam protegendo de
// verdade. Usa o client admin só pro DELETE de pessoa: não tem policy de
// exclusão nenhuma de propósito, exceção estreita guardada pela prévia
// recém-recalculada, não por uma policy geral.
export async function desfazerImportacaoPessoas(
  supabase: Cliente,
  params: { tenant_id: string; importacao_id: string; criado_por: string; previa: PreviaDesfazerImportacaoPessoas },
): Promise<ResultadoDesfazerImportacaoPessoas | { erro: string }> {
  const previaAtual = await preverDesfazerImportacaoPessoas(supabase, { tenant_id: params.tenant_id, importacao_id: params.importacao_id });
  if ("erro" in previaAtual) return previaAtual;

  if (assinaturaPreviaPessoas(previaAtual) !== assinaturaPreviaPessoas(params.previa)) {
    return { erro: "A importação mudou desde a última verificação — recarregue a prévia e confirme de novo." };
  }

  const eventosPorPessoa = new Map<string, EventoAReverter[]>();
  for (const e of previaAtual.eventosAReverter) {
    const lista = eventosPorPessoa.get(e.pessoa_id) ?? [];
    lista.push(e);
    eventosPorPessoa.set(e.pessoa_id, lista);
  }

  let eventosRevertidos = 0;
  const eventosComErro: { evento_id: string; erro: string }[] = [];
  // Pessoa some deste set só se TODOS os lançamentos dela reverteram —
  // parcial não remove nada, senão um evento continuaria vivo apontando
  // pra uma pessoa que já sumiu (achado pensando no caso de parcela
  // renegociada, que estornarEventoFinanceiro ainda barra).
  const pessoasComFalhaDeEvento = new Set<string>();

  for (const [pessoaId, eventos] of eventosPorPessoa) {
    for (const ev of eventos) {
      const resultado = await estornarEventoFinanceiro(supabase, {
        tenant_id: params.tenant_id,
        evento_id: ev.evento_id,
        motivo: "Importação de clientes/fornecedores desfeita",
        criado_por: params.criado_por,
        estornarBaixasAutomaticamente: true,
      });
      if ("erro" in resultado) {
        eventosComErro.push({ evento_id: ev.evento_id, erro: resultado.erro });
        pessoasComFalhaDeEvento.add(pessoaId);
      } else {
        eventosRevertidos++;
      }
    }
  }

  const pessoasRemoviveis = previaAtual.pessoasARemover.filter((p) => !pessoasComFalhaDeEvento.has(p.pessoa_id));

  // Precisa vir ANTES do DELETE de pessoas: o FK importacoes_itens.pessoa_id
  // é ON DELETE SET NULL, então buscar por pessoa_id depois de deletar
  // sempre dá zero linhas — o item nunca era marcado desfeito_em, e a tela
  // de detalhe continuava oferecendo "Desfazer importação" como se nada
  // tivesse acontecido (achado testando ao vivo).
  const itemIdPorPessoa = new Map<string, string>();
  if (pessoasRemoviveis.length > 0) {
    const { data: itensPorPessoa } = await supabase
      .from("importacoes_itens")
      .select("id, pessoa_id")
      .eq("importacao_id", params.importacao_id)
      .eq("tenant_id", params.tenant_id)
      .in(
        "pessoa_id",
        pessoasRemoviveis.map((p) => p.pessoa_id),
      );
    for (const i of itensPorPessoa ?? []) {
      if (i.pessoa_id) itemIdPorPessoa.set(i.pessoa_id, i.id);
    }
  }

  const admin = createAdminClient();
  let removidas = 0;
  const idsRemovidosComSucesso: string[] = [];
  const pessoasComErroDeDelete: PessoaProtegida[] = [];

  for (const p of pessoasRemoviveis) {
    // Estornar o evento não apaga a linha (fica de propósito, ver
    // comentário da função) — ela continua com pessoa_id apontando pra
    // quem vamos remover, e a FK é NO ACTION, sem cascade nem set null.
    // Sem desvincular aqui primeiro, o DELETE da pessoa quebra com erro de
    // FK mesmo depois do lançamento já ter sido revertido com sucesso
    // (achado testando ao vivo — a prévia prometia remover a pessoa, mas
    // ela ficava presa mesmo com o lançamento já estornado). O lançamento
    // em si continua intacto, só perde a referência de "quem" — condizente
    // com o cadastro ter deixado de existir. Usa `eq pessoa_id` (não a
    // lista de eventos revertidos agora) de propósito: pega também um
    // evento que já tivesse sido estornado numa tentativa anterior desta
    // mesma pessoa — esse nem aparece mais em eventosAReverter (a prévia só
    // lista evento vivo), mas continua com o FK preso do jeito antigo.
    const { error: erroDesvincular } = await admin
      .from("eventos_financeiros")
      .update({ pessoa_id: null })
      .eq("pessoa_id", p.pessoa_id)
      .eq("tenant_id", params.tenant_id);
    if (erroDesvincular) {
      pessoasComErroDeDelete.push({ pessoa_id: p.pessoa_id, nome: p.nome, motivo: erroDesvincular.message });
      continue;
    }

    const { error } = await admin.from("pessoas").delete().eq("id", p.pessoa_id).eq("tenant_id", params.tenant_id);
    if (error) {
      pessoasComErroDeDelete.push({ pessoa_id: p.pessoa_id, nome: p.nome, motivo: error.message });
    } else {
      removidas++;
      idsRemovidosComSucesso.push(p.pessoa_id);
    }
  }

  const itemIds = idsRemovidosComSucesso.map((id) => itemIdPorPessoa.get(id)).filter((id): id is string => !!id);
  if (itemIds.length > 0) {
    await supabase.from("importacoes_itens").update({ desfeito_em: new Date().toISOString(), desfeito_por: params.criado_por }).in("id", itemIds);
  }

  const protegidasFinal: PessoaProtegida[] = [
    ...previaAtual.protegidas,
    ...previaAtual.pessoasARemover
      .filter((p) => pessoasComFalhaDeEvento.has(p.pessoa_id))
      .map((p) => ({ pessoa_id: p.pessoa_id, nome: p.nome, motivo: "falha ao reverter lançamento vinculado — veja os detalhes no lançamento" })),
    ...pessoasComErroDeDelete,
  ];

  return { removidas, eventosRevertidos, eventosComErro, protegidas: protegidasFinal };
}
