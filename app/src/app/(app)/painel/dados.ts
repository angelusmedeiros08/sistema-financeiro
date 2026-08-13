import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { CODIGO_CAIXA_E_BANCOS } from "@/lib/contabil/plano-padrao";

type Cliente = SupabaseClient<Database>;

function isoHoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDaquiA(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

function inicioDoMes(offsetMeses = 0): string {
  const data = new Date();
  data.setDate(1);
  data.setMonth(data.getMonth() + offsetMeses);
  return data.toISOString().slice(0, 10);
}

// saldo = soma de débitos - soma de créditos na conta contábil "Caixa e
// Bancos" (natureza devedora) — é o próprio ledger de partida dobrada que
// dá a fonte da verdade, não um campo de saldo armazenado em outro lugar.
async function obterSaldoEmCaixa(supabase: Cliente, tenantId: string): Promise<number> {
  const { data: contaCaixa } = await supabase
    .from("contas_contabeis")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("codigo", CODIGO_CAIXA_E_BANCOS)
    .single();

  if (!contaCaixa) return 0;

  const { data: partidas } = await supabase
    .from("partidas")
    .select("tipo, valor")
    .eq("tenant_id", tenantId)
    .eq("conta_contabil_id", contaCaixa.id);

  if (!partidas) return 0;

  return partidas.reduce(
    (acc, p) => acc + (p.tipo === "DEBITO" ? Number(p.valor) : -Number(p.valor)),
    0,
  );
}

async function obterPendentesPorTipo(
  supabase: Cliente,
  tenantId: string,
  tipo: "RECEITA" | "DESPESA",
  pessoaId?: string,
): Promise<{ total: number; quantidade: number }> {
  let query = supabase
    .from("parcelas")
    .select("valor, eventos_financeiros!inner(tipo, pessoa_id)")
    .eq("tenant_id", tenantId)
    .eq("status", "PENDENTE")
    .eq("eventos_financeiros.tipo", tipo)
    .gte("data_vencimento", isoHoje())
    .lte("data_vencimento", isoDaquiA(30));

  if (pessoaId) query = query.eq("eventos_financeiros.pessoa_id", pessoaId);

  const { data } = await query;

  if (!data) return { total: 0, quantidade: 0 };

  return {
    total: data.reduce((acc, p) => acc + Number(p.valor), 0),
    quantidade: data.length,
  };
}

async function obterResultadoDoMes(supabase: Cliente, tenantId: string, pessoaId?: string): Promise<number> {
  let query = supabase
    .from("eventos_financeiros")
    .select("tipo, valor_total")
    .eq("tenant_id", tenantId)
    .gte("data_competencia", inicioDoMes())
    .lt("data_competencia", inicioDoMes(1));

  if (pessoaId) query = query.eq("pessoa_id", pessoaId);

  const { data } = await query;

  if (!data) return 0;

  return data.reduce(
    (acc, e) => acc + (e.tipo === "RECEITA" ? Number(e.valor_total) : -Number(e.valor_total)),
    0,
  );
}

export type PontoFluxo = { mes: string; resultado: number };

async function obterFluxoUltimosMeses(
  supabase: Cliente,
  tenantId: string,
  quantidadeMeses: number,
  pessoaId?: string,
): Promise<PontoFluxo[]> {
  let query = supabase
    .from("eventos_financeiros")
    .select("tipo, valor_total, data_competencia")
    .eq("tenant_id", tenantId)
    .gte("data_competencia", inicioDoMes(-(quantidadeMeses - 1)));

  if (pessoaId) query = query.eq("pessoa_id", pessoaId);

  const { data } = await query;

  const porMes = new Map<string, number>();
  for (let i = quantidadeMeses - 1; i >= 0; i--) {
    porMes.set(inicioDoMes(-i).slice(0, 7), 0);
  }

  for (const evento of data ?? []) {
    const chave = evento.data_competencia.slice(0, 7);
    if (!porMes.has(chave)) continue;
    const delta = evento.tipo === "RECEITA" ? Number(evento.valor_total) : -Number(evento.valor_total);
    porMes.set(chave, (porMes.get(chave) ?? 0) + delta);
  }

  const nomesMes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return Array.from(porMes.entries()).map(([chave, resultado]) => ({
    mes: nomesMes[Number(chave.slice(5, 7)) - 1],
    resultado,
  }));
}

export type EventoRecente = {
  id: string;
  descricao: string | null;
  tipo: "RECEITA" | "DESPESA";
  valor_total: number;
  status: string | null;
};

async function obterEventosRecentes(supabase: Cliente, tenantId: string, pessoaId?: string): Promise<EventoRecente[]> {
  let query = supabase
    .from("eventos_financeiros")
    .select("id, descricao, tipo, valor_total, parcelas(status)")
    .eq("tenant_id", tenantId)
    .order("data_competencia", { ascending: false })
    .limit(5);

  if (pessoaId) query = query.eq("pessoa_id", pessoaId);

  const { data } = await query;

  return (data ?? []).map((e) => ({
    id: e.id,
    descricao: e.descricao,
    tipo: e.tipo,
    valor_total: Number(e.valor_total),
    status: e.parcelas?.[0]?.status ?? null,
  }));
}

// pessoaId filtra tudo que passa por eventos_financeiros/parcelas — usado
// pelo portal do cliente pra mostrar só os próprios lançamentos. Saldo em
// caixa fica de fora do filtro de propósito: é uma dimensão do caixa da
// empresa inteira, não tem "saldo em caixa de uma pessoa".
export async function obterDadosPainel(supabase: Cliente, tenantId: string, pessoaId?: string) {
  const [saldoEmCaixa, aReceber, aPagar, resultadoDoMes, fluxo, eventosRecentes] = await Promise.all([
    obterSaldoEmCaixa(supabase, tenantId),
    obterPendentesPorTipo(supabase, tenantId, "RECEITA", pessoaId),
    obterPendentesPorTipo(supabase, tenantId, "DESPESA", pessoaId),
    obterResultadoDoMes(supabase, tenantId, pessoaId),
    obterFluxoUltimosMeses(supabase, tenantId, 6, pessoaId),
    obterEventosRecentes(supabase, tenantId, pessoaId),
  ]);

  return { saldoEmCaixa, aReceber, aPagar, resultadoDoMes, fluxo, eventosRecentes };
}
