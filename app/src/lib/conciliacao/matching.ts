import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import type { TipoExtratoLinha } from "./parse";

type Cliente = SupabaseClient<Database>;

// Candidato unificado — pode vir de uma baixa já registrada (só precisa
// confirmar o link) ou de uma parcela pendente/atrasada (confirmar já
// registra a baixa). A UI trata os dois igual numa lista de seleção só.
export type CandidatoConciliacao = {
  chave: string; // "baixa:<id>" | "parcela:<id>" — único na lista, usado como key de seleção
  origem: "baixa" | "parcela";
  id: string;
  data: string;
  valor: number;
  descricao: string;
};

// Mais largo que o limiar de "aproximada" (5 dias) — não é o critério de
// decisão, só o raio de busca, pra não perder candidato de agrupamento cuja
// data individual varie mais que o par isolado exigiria.
const JANELA_DIAS_CANDIDATOS = 10;
const LIMIAR_DIAS_APROXIMADA = 5;

function diasEntre(a: string, b: string): number {
  return Math.abs((new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / 86_400_000);
}

function somarDias(dataIso: string, dias: number): string {
  const data = new Date(`${dataIso}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export async function buscarCandidatosConciliacao(
  supabase: Cliente,
  params: { tenantId: string; contaFinanceiraId: string; data: string; valor: number; tipo: TipoExtratoLinha },
): Promise<CandidatoConciliacao[]> {
  const tipoEvento = params.tipo === "CREDITO" ? "RECEITA" : "DESPESA";
  const dataMinIso = somarDias(params.data, -JANELA_DIAS_CANDIDATOS);
  const dataMaxIso = somarDias(params.data, JANELA_DIAS_CANDIDATOS);

  const [{ data: baixas }, { data: parcelas }, { data: linksExistentes }] = await Promise.all([
    supabase
      .from("baixas")
      .select("id, data_pagamento, valor_pago, parcelas(evento_financeiro_id, eventos_financeiros(tipo, descricao))")
      .eq("tenant_id", params.tenantId)
      .eq("conta_financeira_id", params.contaFinanceiraId)
      .is("estornado_em", null)
      .lte("valor_pago", params.valor)
      .gte("data_pagamento", dataMinIso)
      .lte("data_pagamento", dataMaxIso),
    supabase
      .from("parcelas")
      .select("id, data_vencimento, valor, eventos_financeiros(tipo, descricao)")
      .eq("tenant_id", params.tenantId)
      .in("status", ["PENDENTE", "ATRASADO"])
      .lte("valor", params.valor)
      .gte("data_vencimento", dataMinIso)
      .lte("data_vencimento", dataMaxIso),
    supabase.from("extrato_linha_baixas").select("baixa_id").eq("tenant_id", params.tenantId),
  ]);

  const idsJaConciliados = new Set((linksExistentes ?? []).map((l) => l.baixa_id));

  const candidatosBaixa: CandidatoConciliacao[] = (baixas ?? [])
    .filter((b) => !idsJaConciliados.has(b.id))
    .filter((b) => b.parcelas?.eventos_financeiros?.tipo === tipoEvento)
    .map((b) => ({
      chave: `baixa:${b.id}`,
      origem: "baixa" as const,
      id: b.id,
      data: b.data_pagamento,
      valor: Number(b.valor_pago),
      descricao: b.parcelas?.eventos_financeiros?.descricao ?? "",
    }));

  const candidatosParcela: CandidatoConciliacao[] = (parcelas ?? [])
    .filter((p) => p.eventos_financeiros?.tipo === tipoEvento)
    .map((p) => ({
      chave: `parcela:${p.id}`,
      origem: "parcela" as const,
      id: p.id,
      data: p.data_vencimento,
      valor: Number(p.valor),
      descricao: p.eventos_financeiros?.descricao ?? "",
    }));

  return [...candidatosBaixa, ...candidatosParcela];
}

export type TipoCorrespondenciaConciliacao = "exata" | "aproximada" | "multipla" | "nenhuma";

// Só classifica o caso "decide sozinho" (1 candidato só, valor e data
// batendo) — o resto sempre exige escolha manual na tela, incluindo quando
// 2+ candidatos têm o mesmo valor isolado (ambíguo, mesma regra já usada
// pra homônimo de pessoa: nunca decide em caso de ambiguidade).
export function classificarCorrespondencia(candidatos: CandidatoConciliacao[], linha: { data: string; valor: number }): TipoCorrespondenciaConciliacao {
  const comValorIgual = candidatos.filter((c) => c.valor === linha.valor);
  if (comValorIgual.length === 0) return "nenhuma";
  if (comValorIgual.length > 1) return "multipla";

  const [unico] = comValorIgual;
  if (unico.data === linha.data) return "exata";
  if (diasEntre(unico.data, linha.data) <= LIMIAR_DIAS_APROXIMADA) return "aproximada";
  return "nenhuma";
}
