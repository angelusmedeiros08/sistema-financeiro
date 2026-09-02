import type { Cliente } from "./regime";
import { hojeIsoBrasil } from "@/lib/data-brasil";
import { somarDias } from "./saldo-projetado";

// Fonte única do critério "vencido"/"vence em N dias" — usado tanto pelos
// cards (buscarResumoVencimentos/obterPendentesPorTipo) quanto pelo filtro
// de mesmo nome em Contas a Receber/Pagar (indicador clicável precisa
// chegar exatamente nos registros que compuseram o total mostrado).
export const STATUS_VENCIDO = ["PENDENTE", "RECEBIDO_PARCIAL", "ATRASADO"] as const;
export const STATUS_VENCE_EM_30 = ["PENDENTE"] as const;

export function limitesJanelaVencimento(diasLimite: number): { hojeIso: string; limiteIso: string } {
  const hojeIso = hojeIsoBrasil();
  return { hojeIso, limiteIso: somarDias(hojeIso, diasLimite) };
}

// Faixas fixas, mesmo recorte da planilha de referência (Seção 3.4 do
// mapeamento) — lá é configurável em tabela; aqui fica hardcoded por ora,
// mudança de faixa não é uma necessidade recorrente de tenant a tenant
// como a estrutura de DRE é.
const FAIXAS_VENCIDO = [
  { min: 0, max: 15, rotulo: "0-15 dias" },
  { min: 16, max: 30, rotulo: "16-30 dias" },
  { min: 31, max: 60, rotulo: "31-60 dias" },
  { min: 61, max: 90, rotulo: "61-90 dias" },
  { min: 91, max: 120, rotulo: "91-120 dias" },
  { min: 121, max: 180, rotulo: "121-180 dias" },
  { min: 181, max: Infinity, rotulo: "180+ dias" },
] as const;

const FAIXAS_A_VENCER = [
  { min: 0, max: 15, rotulo: "A vencer 0-15 dias" },
  { min: 16, max: 30, rotulo: "A vencer 16-30 dias" },
  { min: 31, max: 365, rotulo: "A vencer 31-365 dias" },
] as const;

export type FaixaAging = { rotulo: string; total: number; quantidade: number; href: string };

export type AgingResultado = {
  vencido: FaixaAging[];
  aVencer: FaixaAging[];
  totalVencido: number;
  totalAVencer: number;
};

type ParcelaEmAberto = { valor: number; dataVencimento: string };

// Diferença em dias entre duas datas corridas — sempre comparando string
// ISO com string ISO (não instante contra meia-noite UTC), pra "hoje" ser
// sempre hojeIsoBrasil() e nunca `new Date()` direto (ver lib/data-brasil.ts).
function diasDeAtraso(dataVencimento: string, hojeIso: string): number {
  const vencimento = new Date(dataVencimento + "T00:00:00Z").getTime();
  const hoje = new Date(hojeIso + "T00:00:00Z").getTime();
  return Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24));
}

// Destino de uma faixa é sempre Contas a Receber/Pagar (nunca /lancamentos —
// aging é sobre status de parcela em aberto, não movimento contábil por
// regime; ver spec 2026-09-02-drill-down-5a-leva). `vencimento_de`/`ate` são
// os limites de data exatos que reproduzem o mesmo filtro de status+data que
// `classificar` usou pra somar aquela faixa — faixa aberta ("180+ dias") não
// tem limite inferior.
function hrefFaixa(tipo: "RECEITA" | "DESPESA", vencDe: string | null, vencAte: string): string {
  const destino = tipo === "RECEITA" ? "/contas-a-receber" : "/contas-a-pagar";
  const params = new URLSearchParams({ vencimento_ate: vencAte });
  if (vencDe) params.set("vencimento_de", vencDe);
  return `${destino}?${params.toString()}`;
}

function classificar(parcelas: ParcelaEmAberto[], hojeIso: string, tipo: "RECEITA" | "DESPESA"): AgingResultado {
  const vencido = FAIXAS_VENCIDO.map((f) => ({
    rotulo: f.rotulo,
    total: 0,
    quantidade: 0,
    // atraso ∈ [min,max] ⇔ vencimento ∈ [hoje−max, hoje−min]. max=Infinity
    // (última faixa) não gera limite inferior.
    href: hrefFaixa(tipo, Number.isFinite(f.max) ? somarDias(hojeIso, -f.max) : null, somarDias(hojeIso, -f.min)),
  }));
  const aVencer = FAIXAS_A_VENCER.map((f) => ({
    rotulo: f.rotulo,
    total: 0,
    quantidade: 0,
    // diasParaVencer ∈ [min,max] ⇔ vencimento ∈ [hoje+min, hoje+max].
    href: hrefFaixa(tipo, somarDias(hojeIso, f.min), somarDias(hojeIso, f.max)),
  }));

  for (const parcela of parcelas) {
    const atraso = diasDeAtraso(parcela.dataVencimento, hojeIso);
    if (atraso >= 0) {
      const i = FAIXAS_VENCIDO.findIndex((f) => atraso >= f.min && atraso <= f.max);
      if (i !== -1) {
        vencido[i].total += parcela.valor;
        vencido[i].quantidade += 1;
      }
    } else {
      const diasParaVencer = -atraso;
      const i = FAIXAS_A_VENCER.findIndex((f) => diasParaVencer >= f.min && diasParaVencer <= f.max);
      if (i !== -1) {
        aVencer[i].total += parcela.valor;
        aVencer[i].quantidade += 1;
      }
    }
  }

  return {
    vencido,
    aVencer,
    totalVencido: vencido.reduce((s, f) => s + f.total, 0),
    totalAVencer: aVencer.reduce((s, f) => s + f.total, 0),
  };
}

// Contas a pagar/receber em aberto por faixa de vencimento — não depende
// das views de regime (essas são sobre movimento já lançado; aging é sobre
// saldo residual de parcela, que já é o que /contas-a-pagar e
// /contas-a-receber calculam). Reaproveita o mesmo cálculo de saldo
// residual (valor da parcela − soma de baixas válidas) em vez de duplicar.
export async function buscarAging(
  supabase: Cliente,
  params: { tenantId: string; tipo: "RECEITA" | "DESPESA" },
): Promise<AgingResultado> {
  const { data } = await supabase
    .from("parcelas")
    .select("valor, data_vencimento, eventos_financeiros!inner(tipo), baixas(valor_pago, estornado_em)")
    .eq("tenant_id", params.tenantId)
    .eq("eventos_financeiros.tipo", params.tipo)
    .in("status", STATUS_VENCIDO);

  const parcelas: ParcelaEmAberto[] = (data ?? []).map((p) => {
    const pago = (p.baixas ?? []).filter((b) => !b.estornado_em).reduce((s, b) => s + Number(b.valor_pago), 0);
    return { valor: Number(p.valor) - pago, dataVencimento: p.data_vencimento };
  });

  return classificar(parcelas, hojeIsoBrasil(), params.tipo);
}

export type ResumoVencimentos = {
  vencidoTotal: number;
  vencidoQuantidade: number;
  venceHojeTotal: number;
  venceHojeQuantidade: number;
  venceEsteMesTotal: number;
  venceEsteMesQuantidade: number;
};

// Quebra vencidos × vencendo hoje — pedido explícito do sócio do usuário
// pro Painel e reaproveitado aqui na Visão geral de Relatórios e na aba
// Visão geral de Configurações → Contas Financeiras (mesma pergunta, três
// telas diferentes). `venceEsteMesTotal` soma o que vence depois de hoje
// mas ainda dentro do mês corrente — mesmo dataset já buscado (a query não
// tinha teto de data), só um balde novo na mesma varredura.
export async function buscarResumoVencimentos(
  supabase: Cliente,
  params: { tenantId: string; tipo: "RECEITA" | "DESPESA"; pessoaId?: string },
): Promise<ResumoVencimentos> {
  let query = supabase
    .from("parcelas")
    .select("valor, data_vencimento, eventos_financeiros!inner(tipo, pessoa_id), baixas(valor_pago, estornado_em)")
    .eq("tenant_id", params.tenantId)
    .eq("eventos_financeiros.tipo", params.tipo)
    .in("status", STATUS_VENCIDO);

  if (params.pessoaId) query = query.eq("eventos_financeiros.pessoa_id", params.pessoaId);

  const { data } = await query;

  const hojeIso = hojeIsoBrasil();
  const [anoHoje, mesHoje] = hojeIso.split("-").map(Number);
  const fimDoMesIso = new Date(Date.UTC(anoHoje, mesHoje, 0)).toISOString().slice(0, 10);
  const resumo: ResumoVencimentos = {
    vencidoTotal: 0,
    vencidoQuantidade: 0,
    venceHojeTotal: 0,
    venceHojeQuantidade: 0,
    venceEsteMesTotal: 0,
    venceEsteMesQuantidade: 0,
  };

  for (const p of data ?? []) {
    const pago = (p.baixas ?? []).filter((b) => !b.estornado_em).reduce((s, b) => s + Number(b.valor_pago), 0);
    const saldo = Number(p.valor) - pago;
    if (p.data_vencimento < hojeIso) {
      resumo.vencidoTotal += saldo;
      resumo.vencidoQuantidade += 1;
    } else if (p.data_vencimento === hojeIso) {
      resumo.venceHojeTotal += saldo;
      resumo.venceHojeQuantidade += 1;
    } else if (p.data_vencimento <= fimDoMesIso) {
      resumo.venceEsteMesTotal += saldo;
      resumo.venceEsteMesQuantidade += 1;
    }
  }

  return resumo;
}

export type AgingPorParticipante = {
  pessoaId: string | null;
  nome: string;
  totalEmAberto: number;
  diasDeAtrasoMaximo: number;
  // Ausente quando não há pessoa vinculada — não existe filtro de "sem
  // pessoa" em Contas a Receber/Pagar hoje, diferente do mecanismo de
  // /lancamentos (que aceita o literal `nenhuma`).
  href?: string;
};

export async function buscarAgingPorParticipante(
  supabase: Cliente,
  params: { tenantId: string; tipo: "RECEITA" | "DESPESA" },
): Promise<AgingPorParticipante[]> {
  const { data } = await supabase
    .from("parcelas")
    .select("valor, data_vencimento, eventos_financeiros!inner(tipo, pessoas(id, nome)), baixas(valor_pago, estornado_em)")
    .eq("tenant_id", params.tenantId)
    .eq("eventos_financeiros.tipo", params.tipo)
    .in("status", STATUS_VENCIDO);

  const hojeIso = hojeIsoBrasil();
  const porPessoa = new Map<string, AgingPorParticipante>();

  for (const p of data ?? []) {
    const pago = (p.baixas ?? []).filter((b) => !b.estornado_em).reduce((s, b) => s + Number(b.valor_pago), 0);
    const saldo = Number(p.valor) - pago;
    const pessoa = p.eventos_financeiros?.pessoas;
    const chave = pessoa?.id ?? "__sem_pessoa__";
    const atraso = Math.max(0, diasDeAtraso(p.data_vencimento, hojeIso));

    const atual = porPessoa.get(chave) ?? {
      pessoaId: pessoa?.id ?? null,
      nome: pessoa?.nome ?? "Sem pessoa vinculada",
      totalEmAberto: 0,
      diasDeAtrasoMaximo: 0,
      // `totalEmAberto` soma TODO status em STATUS_VENCIDO (não só o que já
      // venceu — inclui pendente ainda dentro do prazo), então não pode
      // usar a situação "vencido" (tem filtro de data extra, subcontaria).
      // Sem `situacao` na URL, contas-a-receber/pagar detecta `pessoa` sem
      // situação explícita e filtra por STATUS_VENCIDO diretamente (não
      // pelo status de "aberto", que é um conjunto diferente:
      // PENDENTE/RECEBIDO_PARCIAL/RENEGOCIADO) — acham em revisão de código
      // que os dois conjuntos divergiam (RENEGOCIADO só num, ATRASADO só no
      // outro), corrigido pra usar STATUS_VENCIDO exato dos dois lados.
      href: pessoa?.id ? `/${params.tipo === "RECEITA" ? "contas-a-receber" : "contas-a-pagar"}?pessoa=${pessoa.id}` : undefined,
    };
    atual.totalEmAberto += saldo;
    atual.diasDeAtrasoMaximo = Math.max(atual.diasDeAtrasoMaximo, atraso);
    porPessoa.set(chave, atual);
  }

  return [...porPessoa.values()].sort((a, b) => b.totalEmAberto - a.totalEmAberto);
}
