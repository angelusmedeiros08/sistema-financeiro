import type { Cliente, Regime } from "./regime";
import { buscarMovimento } from "./regime";
import { montarHrefLancamentos } from "./drill-down";

export type LinhaCentroCusto = {
  centroCustoId: string;
  nome: string;
  entradas: number;
  saidas: number;
  saldo: number;
  margemPercentual: number;
  // Saldo é entradas−saidas — não existe uma lista de lançamentos cujo
  // total bate com essa subtração, então não tem link próprio. Entradas e
  // saídas são somas de verdade, cada uma com seu destino (mesmo raciocínio
  // de pessoa em concentracao-receita.ts, via o filtro `tipo`).
  hrefEntradas: string;
  hrefSaidas: string;
};

// Mini-P&L por centro de custo: Entradas, Saídas, Saldo, Margem% — mesma
// leitura da aba Centro_Custo da planilha (Seção 3.6 do mapeamento). Só
// entra aqui o lançamento que foi efetivamente rateado por centro de custo
// — o que não foi dividido por centro não aparece em nenhuma linha
// (comportamento correto: centro de custo é opcional por lançamento).
export async function buscarCentroCusto(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; dataInicio: string; dataFim: string; origemHref: string },
): Promise<LinhaCentroCusto[]> {
  const [movimento, { data: centros }] = await Promise.all([
    buscarMovimento(supabase, params),
    supabase.from("centros_custo").select("id, nome").eq("tenant_id", params.tenantId),
  ]);

  const nomePorId = new Map((centros ?? []).map((c) => [c.id, c.nome]));
  const porCentro = new Map<string, { entradas: number; saidas: number }>();

  for (const linha of movimento) {
    if (!linha.centroCustoId) continue;
    const atual = porCentro.get(linha.centroCustoId) ?? { entradas: 0, saidas: 0 };
    if (linha.tipo === "RECEITA") atual.entradas += linha.valor;
    else atual.saidas += linha.valor;
    porCentro.set(linha.centroCustoId, atual);
  }

  return [...porCentro.entries()]
    .map(([centroCustoId, { entradas, saidas }]) => {
      const saldo = entradas - saidas;
      const hrefBase = {
        tipoEntidade: "centro_custo" as const,
        entidadeId: centroCustoId,
        regime: params.regime,
        periodoInicio: params.dataInicio,
        periodoFim: params.dataFim,
        origemHref: params.origemHref,
      };
      return {
        centroCustoId,
        nome: nomePorId.get(centroCustoId) ?? "-",
        entradas,
        saidas,
        saldo,
        margemPercentual: entradas > 0 ? saldo / entradas : 0,
        hrefEntradas: montarHrefLancamentos({ ...hrefBase, tipo: "RECEITA" }),
        hrefSaidas: montarHrefLancamentos({ ...hrefBase, tipo: "DESPESA" }),
      };
    })
    .sort((a, b) => b.saldo - a.saldo);
}
