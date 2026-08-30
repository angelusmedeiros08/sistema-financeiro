import type { Cliente, Regime, Granularidade } from "./regime";
import { buscarMovimento, chaveGranularidade } from "./regime";

export type PontoFluxoCaixa = {
  chave: string;
  entradas: number;
  saidas: number;
  saldoPeriodo: number;
  saldoAcumulado: number;
};

// Grade por período (Diário/Semanal/Mensal/... conforme granularidade) —
// mesmo mecanismo de drill up/down da aba FluxoCaixa da planilha (Seção 8.4
// do mapeamento), só que resolvido pela granularidade escolhida na UI em
// vez de um clique de radio button que troca nível de pivô.
export async function buscarFluxoCaixaGrade(
  supabase: Cliente,
  params: {
    tenantId: string;
    regime: Regime;
    granularidade: Granularidade;
    dataInicio: string;
    dataFim: string;
    contaFinanceiraId?: string;
    saldoInicial?: number;
  },
): Promise<PontoFluxoCaixa[]> {
  const movimento = await buscarMovimento(supabase, params);
  const filtrado = params.contaFinanceiraId
    ? movimento.filter((l) => l.contaFinanceiraId === params.contaFinanceiraId)
    : movimento;

  const porChave = new Map<string, { entradas: number; saidas: number }>();
  for (const linha of filtrado) {
    const chave = chaveGranularidade(linha.data, params.granularidade);
    const atual = porChave.get(chave) ?? { entradas: 0, saidas: 0 };
    if (linha.tipo === "RECEITA") atual.entradas += linha.valor;
    else atual.saidas += linha.valor;
    porChave.set(chave, atual);
  }

  let acumulado = params.saldoInicial ?? 0;
  return [...porChave.keys()].sort().map((chave) => {
    const { entradas, saidas } = porChave.get(chave)!;
    const saldoPeriodo = entradas - saidas;
    acumulado += saldoPeriodo;
    return { chave, entradas, saidas, saldoPeriodo, saldoAcumulado: acumulado };
  });
}

export type PontoPrevistoRealizado = {
  chave: string;
  previsto: number;
  realizado: number;
  variacao: number;
};

// Previsto (vencimento) x Realizado (pagamento) lado a lado por mês —
// pedido explícito do usuário e do sócio dele, independente do módulo de
// Previsionamento. Não quebra por atividade de DFC (Operacional/Investimento/
// Financiamento) como a planilha faz — isso exigiria classificar cada
// categoria numa atividade de DFC, um conceito novo que não foi pedido
// nesta fase; a comparação aqui é no total, mês a mês.
export async function buscarPrevistoRealizado(
  supabase: Cliente,
  params: { tenantId: string; granularidade: Granularidade; dataInicio: string; dataFim: string },
): Promise<PontoPrevistoRealizado[]> {
  const [previstoMov, realizadoMov] = await Promise.all([
    buscarMovimento(supabase, { tenantId: params.tenantId, regime: "previsto", dataInicio: params.dataInicio, dataFim: params.dataFim }),
    buscarMovimento(supabase, { tenantId: params.tenantId, regime: "realizado", dataInicio: params.dataInicio, dataFim: params.dataFim }),
  ]);

  const porChave = new Map<string, { previsto: number; realizado: number }>();

  for (const linha of previstoMov) {
    const chave = chaveGranularidade(linha.data, params.granularidade);
    const atual = porChave.get(chave) ?? { previsto: 0, realizado: 0 };
    atual.previsto += linha.tipo === "RECEITA" ? linha.valor : -linha.valor;
    porChave.set(chave, atual);
  }
  for (const linha of realizadoMov) {
    const chave = chaveGranularidade(linha.data, params.granularidade);
    const atual = porChave.get(chave) ?? { previsto: 0, realizado: 0 };
    atual.realizado += linha.tipo === "RECEITA" ? linha.valor : -linha.valor;
    porChave.set(chave, atual);
  }

  return [...porChave.keys()].sort().map((chave) => {
    const { previsto, realizado } = porChave.get(chave)!;
    return { chave, previsto, realizado, variacao: realizado - previsto };
  });
}
