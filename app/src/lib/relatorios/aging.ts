import type { Cliente } from "./regime";

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

export type FaixaAging = { rotulo: string; total: number; quantidade: number };

export type AgingResultado = {
  vencido: FaixaAging[];
  aVencer: FaixaAging[];
  totalVencido: number;
  totalAVencer: number;
};

type ParcelaEmAberto = { valor: number; dataVencimento: string };

function diasDeAtraso(dataVencimento: string, hoje: Date): number {
  const vencimento = new Date(dataVencimento + "T00:00:00Z");
  return Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
}

function classificar(parcelas: ParcelaEmAberto[], hoje: Date): AgingResultado {
  const vencido = FAIXAS_VENCIDO.map((f) => ({ rotulo: f.rotulo, total: 0, quantidade: 0 }));
  const aVencer = FAIXAS_A_VENCER.map((f) => ({ rotulo: f.rotulo, total: 0, quantidade: 0 }));

  for (const parcela of parcelas) {
    const atraso = diasDeAtraso(parcela.dataVencimento, hoje);
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
    .in("status", ["PENDENTE", "RECEBIDO_PARCIAL", "ATRASADO"]);

  const parcelas: ParcelaEmAberto[] = (data ?? []).map((p) => {
    const pago = (p.baixas ?? []).filter((b) => !b.estornado_em).reduce((s, b) => s + Number(b.valor_pago), 0);
    return { valor: Number(p.valor) - pago, dataVencimento: p.data_vencimento };
  });

  return classificar(parcelas, new Date());
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
    .in("status", ["PENDENTE", "RECEBIDO_PARCIAL", "ATRASADO"]);

  if (params.pessoaId) query = query.eq("eventos_financeiros.pessoa_id", params.pessoaId);

  const { data } = await query;

  const hoje = new Date();
  const hojeIso = hoje.toISOString().slice(0, 10);
  const fimDoMesIso = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
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
    .in("status", ["PENDENTE", "RECEBIDO_PARCIAL", "ATRASADO"]);

  const hoje = new Date();
  const porPessoa = new Map<string, AgingPorParticipante>();

  for (const p of data ?? []) {
    const pago = (p.baixas ?? []).filter((b) => !b.estornado_em).reduce((s, b) => s + Number(b.valor_pago), 0);
    const saldo = Number(p.valor) - pago;
    const pessoa = p.eventos_financeiros?.pessoas;
    const chave = pessoa?.id ?? "__sem_pessoa__";
    const atraso = Math.max(0, diasDeAtraso(p.data_vencimento, hoje));

    const atual = porPessoa.get(chave) ?? {
      pessoaId: pessoa?.id ?? null,
      nome: pessoa?.nome ?? "Sem pessoa vinculada",
      totalEmAberto: 0,
      diasDeAtrasoMaximo: 0,
    };
    atual.totalEmAberto += saldo;
    atual.diasDeAtrasoMaximo = Math.max(atual.diasDeAtrasoMaximo, atraso);
    porPessoa.set(chave, atual);
  }

  return [...porPessoa.values()].sort((a, b) => b.totalEmAberto - a.totalEmAberto);
}
