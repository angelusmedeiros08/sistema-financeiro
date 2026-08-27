import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { criarEventoFinanceiro, type LinhaCategoria } from "./evento-financeiro";
import { hojeIsoBrasil } from "@/lib/data-brasil";

type Cliente = SupabaseClient<Database>;
type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];
type UnidadeIntervalo = Database["public"]["Enums"]["unidade_intervalo"];

// Generaliza adicionarMeses() de evento-financeiro.ts (que só cobre mês, pra
// parcelamento) pras três unidades que uma regra de recorrência aceita —
// dia e semana são soma direta; mês continua grudando no último dia do mês
// de destino quando o dia de origem não existir.
function avancarData(dataISO: string, unidade: UnidadeIntervalo, quantidade: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);

  if (unidade === "DIA") {
    return new Date(Date.UTC(ano, mes - 1, dia + quantidade)).toISOString().slice(0, 10);
  }
  if (unidade === "SEMANA") {
    return new Date(Date.UTC(ano, mes - 1, dia + quantidade * 7)).toISOString().slice(0, 10);
  }

  const primeiroDiaAlvo = new Date(Date.UTC(ano, mes - 1 + quantidade, 1));
  const ultimoDiaDoMesAlvo = new Date(
    Date.UTC(primeiroDiaAlvo.getUTCFullYear(), primeiroDiaAlvo.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const diaFinal = Math.min(dia, ultimoDiaDoMesAlvo);
  return new Date(Date.UTC(primeiroDiaAlvo.getUTCFullYear(), primeiroDiaAlvo.getUTCMonth(), diaFinal))
    .toISOString()
    .slice(0, 10);
}

// Calcula a data da N-ésima ocorrência direto a partir de data_inicio (N =
// quantas já foram geradas) — nunca acumula a partir da última gerada, pra
// não acumular deriva de arredondamento ao longo de uma série longa.
function calcularProximaOcorrencia(regra: {
  data_inicio: string;
  unidade_intervalo: UnidadeIntervalo;
  intervalo: number;
  ocorrencias_geradas: number;
}): string {
  return avancarData(regra.data_inicio, regra.unidade_intervalo, regra.intervalo * regra.ocorrencias_geradas);
}

export type ParametrosRegraRecorrencia = {
  tenant_id: string;
  tipo: TipoCategoria;
  descricao: string;
  valor_total: number;
  categorias: LinhaCategoria[];
  pessoa_id?: string | null;
  numero_parcelas: number;
  unidade_intervalo: UnidadeIntervalo;
  intervalo: number;
  data_inicio: string;
  numero_ocorrencias?: number | null;
  data_fim?: string | null;
  criado_por?: string;
};

function validarTerminoExclusivo(numeroOcorrencias?: number | null, dataFim?: string | null) {
  if (numeroOcorrencias != null && dataFim != null) {
    return { erro: "Escolha um jeito de terminar a recorrência: número de ocorrências OU data, nunca os dois." };
  }
  return null;
}

export async function criarRegraRecorrencia(
  supabase: Cliente,
  params: ParametrosRegraRecorrencia,
): Promise<{ regra_id: string } | { erro: string }> {
  const erroTermino = validarTerminoExclusivo(params.numero_ocorrencias, params.data_fim);
  if (erroTermino) return erroTermino;

  const somaCategorias = params.categorias.reduce((acc, c) => acc + c.valor, 0);
  if (Math.round((somaCategorias - params.valor_total) * 100) !== 0) {
    return { erro: "A soma das categorias não bate com o valor total." };
  }

  const { data, error } = await supabase
    .from("regras_recorrencia")
    .insert({
      tenant_id: params.tenant_id,
      tipo: params.tipo,
      descricao: params.descricao,
      valor_total: params.valor_total,
      categorias_json: params.categorias,
      pessoa_id: params.pessoa_id ?? null,
      numero_parcelas: params.numero_parcelas,
      unidade_intervalo: params.unidade_intervalo,
      intervalo: params.intervalo,
      data_inicio: params.data_inicio,
      numero_ocorrencias: params.numero_ocorrencias ?? null,
      data_fim: params.data_fim ?? null,
      criado_por: params.criado_por,
    })
    .select("id")
    .single();

  if (error || !data) return { erro: error?.message ?? "Falha ao criar regra de recorrência." };

  // gera na hora qualquer ocorrência já vencida (ex.: data_inicio = hoje)
  // em vez de fazer o usuário esperar o job diário pra ver o primeiro
  // lançamento da série — mesmo comportamento de "confirmado
  // automaticamente" que uma ocorrência normal do job teria.
  const { data: regraCriada } = await supabase.from("regras_recorrencia").select("*").eq("id", data.id).single();
  if (regraCriada) {
    await gerarOcorrenciasDaRegra(supabase, regraCriada, hojeIsoBrasil());
  }

  return { regra_id: data.id };
}

// Só afeta ocorrências futuras (ainda não geradas) — as já criadas são
// eventos financeiros comuns, editados individualmente pelo caminho que já
// existe. Nunca reabre um evento já lançado.
export async function editarRegraRecorrencia(
  supabase: Cliente,
  params: {
    regra_id: string;
    tenant_id: string;
    descricao?: string;
    valor_total?: number;
    categorias?: LinhaCategoria[];
    pessoa_id?: string | null;
    numero_parcelas?: number;
    unidade_intervalo?: UnidadeIntervalo;
    intervalo?: number;
    numero_ocorrencias?: number | null;
    data_fim?: string | null;
  },
): Promise<{ sucesso: true } | { erro: string }> {
  if ("numero_ocorrencias" in params || "data_fim" in params) {
    const erroTermino = validarTerminoExclusivo(params.numero_ocorrencias, params.data_fim);
    if (erroTermino) return erroTermino;
  }

  if (params.categorias && params.valor_total != null) {
    const soma = params.categorias.reduce((acc, c) => acc + c.valor, 0);
    if (Math.round((soma - params.valor_total) * 100) !== 0) {
      return { erro: "A soma das categorias não bate com o valor total." };
    }
  }

  const { error } = await supabase
    .from("regras_recorrencia")
    .update({
      descricao: params.descricao,
      valor_total: params.valor_total,
      categorias_json: params.categorias,
      pessoa_id: params.pessoa_id,
      numero_parcelas: params.numero_parcelas,
      unidade_intervalo: params.unidade_intervalo,
      intervalo: params.intervalo,
      numero_ocorrencias: params.numero_ocorrencias,
      data_fim: params.data_fim,
    })
    .eq("id", params.regra_id)
    .eq("tenant_id", params.tenant_id);

  if (error) return { erro: error.message };
  return { sucesso: true };
}

export async function cancelarRegraRecorrencia(
  supabase: Cliente,
  params: { regra_id: string; tenant_id: string },
): Promise<{ sucesso: true } | { erro: string }> {
  const { error } = await supabase
    .from("regras_recorrencia")
    .update({ ativa: false })
    .eq("id", params.regra_id)
    .eq("tenant_id", params.tenant_id);

  if (error) return { erro: error.message };
  return { sucesso: true };
}

const JANELA_ROLANTE_DIAS = 90;
// trava de segurança por regra numa única execução — nunca deveria chegar
// perto disso numa rodada normal, só evita loop descontrolado se a janela
// ou a data de uma regra estiverem erradas de algum jeito.
const MAX_OCORRENCIAS_POR_EXECUCAO = 24;

type RegraRecorrenciaRow = Database["public"]["Tables"]["regras_recorrencia"]["Row"];

// Núcleo compartilhado entre o job diário (todas as regras devidas, todos os
// tenants) e a criação de uma regra nova (gera na hora a 1ª ocorrência se
// data_inicio já estiver vencida, em vez de fazer o usuário esperar o job
// do dia seguinte pra ver o primeiro lançamento da série).
async function gerarOcorrenciasDaRegra(
  supabase: Cliente,
  regra: RegraRecorrenciaRow,
  limiteJanela: string,
): Promise<{ geradas: number; erro?: string }> {
  let ocorrenciasGeradas = regra.ocorrencias_geradas;
  let ativa = regra.ativa;
  let geradas = 0;
  let erro: string | undefined;

  for (let i = 0; i < MAX_OCORRENCIAS_POR_EXECUCAO; i++) {
    if (regra.numero_ocorrencias != null && ocorrenciasGeradas >= regra.numero_ocorrencias) break;

    const proximaData = calcularProximaOcorrencia({
      data_inicio: regra.data_inicio,
      unidade_intervalo: regra.unidade_intervalo,
      intervalo: regra.intervalo,
      ocorrencias_geradas: ocorrenciasGeradas,
    });

    if (regra.data_fim != null && proximaData > regra.data_fim) {
      ativa = false;
      break;
    }
    if (proximaData > limiteJanela) break; // fora da janela rolante — a próxima rodada do job pega essa ocorrência

    const resultado = await criarEventoFinanceiro(supabase, {
      tenant_id: regra.tenant_id,
      tipo: regra.tipo,
      descricao: regra.descricao,
      valor_total: regra.valor_total,
      data_competencia: proximaData,
      categorias: regra.categorias_json as unknown as LinhaCategoria[],
      pessoa_id: regra.pessoa_id,
      numero_parcelas: regra.numero_parcelas,
      primeiro_vencimento: proximaData,
      criado_por: regra.criado_por ?? undefined,
      regra_recorrencia_id: regra.id,
      // Chave determinística (regra + data da ocorrência) — o UPDATE de
      // `ocorrencias_geradas` só persiste uma vez, no fim do loop inteiro;
      // se a função serverless for interrompida no meio (timeout, sem
      // `maxDuration` configurado), o contador fica desatualizado e a
      // próxima execução do cron recalcularia a mesma ocorrência a partir
      // do zero. Com import_key, o RPC criar_evento_financeiro (que já
      // devolve o evento existente em vez de recriar, ver Seção 3 da spec
      // de importação) torna essa regeneração idempotente — achado em
      // revisão de código.
      import_key: `recorrencia:${regra.id}:${proximaData}`,
    });

    if ("erro" in resultado) {
      erro = resultado.erro;
      break;
    }

    ocorrenciasGeradas += 1;
    geradas += 1;

    if (regra.numero_ocorrencias != null && ocorrenciasGeradas >= regra.numero_ocorrencias) {
      ativa = false;
      break;
    }
  }

  if (ocorrenciasGeradas !== regra.ocorrencias_geradas || ativa !== regra.ativa) {
    await supabase
      .from("regras_recorrencia")
      .update({ ocorrencias_geradas: ocorrenciasGeradas, ultima_geracao_em: new Date().toISOString(), ativa })
      .eq("id", regra.id);
  }

  return { geradas, erro };
}

// Chamada pela rota /api/cron/gerar-recorrencias (via pg_cron+pg_net) com um
// client admin (service role) — o job atravessa todos os tenants, então não
// há usuário autenticado nem RLS aplicável; o isolamento é o mesmo de
// sempre: cada operação já filtra por tenant_id explicitamente.
export async function gerarOcorrenciasPendentes(
  supabase: Cliente,
): Promise<{ ocorrencias_geradas: number; erros: string[] }> {
  const hoje = hojeIsoBrasil();
  const limiteJanela = avancarData(hoje, "DIA", JANELA_ROLANTE_DIAS);

  const { data: regras, error } = await supabase.from("regras_recorrencia").select("*").eq("ativa", true);

  if (error || !regras) {
    return { ocorrencias_geradas: 0, erros: [error?.message ?? "Falha ao carregar regras de recorrência ativas."] };
  }

  let totalGeradas = 0;
  const erros: string[] = [];

  for (const regra of regras) {
    const resultado = await gerarOcorrenciasDaRegra(supabase, regra, limiteJanela);
    totalGeradas += resultado.geradas;
    if (resultado.erro) erros.push(`Regra ${regra.id} (${regra.descricao}): ${resultado.erro}`);
  }

  return { ocorrencias_geradas: totalGeradas, erros };
}
