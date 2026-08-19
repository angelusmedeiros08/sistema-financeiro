import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Database, Json } from "@/utils/supabase/database.types";

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
};

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

export async function atualizarItemImportacao(
  supabase: Cliente,
  params: { item_id: string; status: "sucesso" | "erro"; pessoa_id?: string | null; erro?: string | null },
): Promise<{ sucesso: true } | { erro: string }> {
  const { error } = await supabase
    .from("importacoes_itens")
    .update({ status: params.status, pessoa_id: params.pessoa_id ?? null, erro: params.erro ?? null })
    .eq("id", params.item_id);

  if (error) return { erro: error.message };
  return { sucesso: true };
}

export async function finalizarImportacao(
  supabase: Cliente,
  params: { importacao_id: string; status: "concluida" | "cancelada" },
): Promise<{ sucesso: true } | { erro: string }> {
  const { error } = await supabase.from("importacoes").update({ status: params.status }).eq("id", params.importacao_id);
  if (error) return { erro: error.message };
  return { sucesso: true };
}

export async function listarImportacoes(supabase: Cliente, tenant_id: string): Promise<ResumoImportacao[]> {
  const { data } = await supabase
    .from("importacoes")
    .select("id, tipo, nome_arquivo, status, total_linhas, criado_em, usuarios(nome), importacoes_itens(status)")
    .eq("tenant_id", tenant_id)
    .order("criado_em", { ascending: false });

  return (data ?? []).map((i) => {
    const itens = i.importacoes_itens as { status: StatusItemImportacao }[];
    return {
      id: i.id,
      tipo: i.tipo,
      nomeArquivo: i.nome_arquivo,
      status: i.status,
      totalLinhas: i.total_linhas,
      criadoPorNome: i.usuarios?.nome ?? null,
      criadoEm: i.criado_em,
      sucessos: itens.filter((it) => it.status === "sucesso").length,
      erros: itens.filter((it) => it.status === "erro").length,
      pendentes: itens.filter((it) => it.status === "pendente").length,
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
    .select("id, linha_numero, status, acao, pessoa_id, erro, dados_normalizados, desfeito_em")
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
    .select("id, linha_numero, status, acao, pessoa_id, erro, dados_normalizados, desfeito_em")
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
    dadosNormalizados: it.dados_normalizados,
  }));
}

export async function marcarImportacaoRetomando(supabase: Cliente, params: { importacao_id: string }): Promise<void> {
  await supabase.from("importacoes").update({ status: "em_andamento" }).eq("id", params.importacao_id);
}

// Desfaz uma importação: apaga só as pessoas que ELA criou (nunca as que
// atualizou — não existe como desfazer um UPDATE sem saber o valor
// anterior) e só as que ainda não têm nenhum lançamento financeiro
// vinculado. Uma pessoa criada pela importação e já usada numa venda ou
// lançamento fica protegida — apagar ela quebraria a integridade do
// histórico financeiro. Usa o client admin só pra esse DELETE: `pessoas`
// não tem policy de exclusão nenhuma de propósito (nada mais no app apaga
// pessoa), então essa é uma exceção estreita, guardada pela checagem de
// lançamento em código, não uma policy geral.
export async function desfazerImportacao(
  supabase: Cliente,
  params: { tenant_id: string; importacao_id: string },
): Promise<{ removidas: number; protegidas: { pessoa_id: string; nome: string }[] } | { erro: string }> {
  const { data: itensCriados } = await supabase
    .from("importacoes_itens")
    .select("id, pessoa_id")
    .eq("importacao_id", params.importacao_id)
    .eq("tenant_id", params.tenant_id)
    .eq("status", "sucesso")
    .eq("acao", "criar")
    .is("desfeito_em", null)
    .not("pessoa_id", "is", null);

  if (!itensCriados || itensCriados.length === 0) return { removidas: 0, protegidas: [] };

  const pessoaIds = itensCriados.map((i) => i.pessoa_id as string);
  const admin = createAdminClient();

  const { data: comLancamento } = await admin.from("eventos_financeiros").select("pessoa_id").in("pessoa_id", pessoaIds);
  const protegidosSet = new Set((comLancamento ?? []).map((e) => e.pessoa_id));

  const removiveis = pessoaIds.filter((id) => !protegidosSet.has(id));
  const protegidasIds = pessoaIds.filter((id) => protegidosSet.has(id));

  let protegidas: { pessoa_id: string; nome: string }[] = [];
  if (protegidasIds.length > 0) {
    const { data: nomes } = await admin.from("pessoas").select("id, nome").in("id", protegidasIds);
    protegidas = (nomes ?? []).map((p) => ({ pessoa_id: p.id, nome: p.nome }));
  }

  if (removiveis.length > 0) {
    const { error: erroDelete } = await admin.from("pessoas").delete().in("id", removiveis).eq("tenant_id", params.tenant_id);
    if (erroDelete) return { erro: erroDelete.message };

    const itemIdsRemovidos = itensCriados.filter((i) => removiveis.includes(i.pessoa_id as string)).map((i) => i.id);
    await supabase.from("importacoes_itens").update({ desfeito_em: new Date().toISOString() }).in("id", itemIdsRemovidos);
  }

  return { removidas: removiveis.length, protegidas };
}
