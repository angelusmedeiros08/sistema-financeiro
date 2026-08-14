import type { Cliente, Regime } from "./regime";
import { buscarMovimento } from "./regime";

export type LinhaCentroCusto = {
  centroCustoId: string;
  nome: string;
  entradas: number;
  saidas: number;
  saldo: number;
  margemPercentual: number;
};

// Mini-P&L por centro de custo: Entradas, Saídas, Saldo, Margem% — mesma
// leitura da aba Centro_Custo da planilha (Seção 3.6 do mapeamento). Só
// entra aqui o lançamento que foi efetivamente rateado por centro de custo
// — o que não foi dividido por centro não aparece em nenhuma linha
// (comportamento correto: centro de custo é opcional por lançamento).
export async function buscarCentroCusto(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; dataInicio: string; dataFim: string },
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
      return {
        centroCustoId,
        nome: nomePorId.get(centroCustoId) ?? "-",
        entradas,
        saidas,
        saldo,
        margemPercentual: entradas > 0 ? saldo / entradas : 0,
      };
    })
    .sort((a, b) => b.saldo - a.saldo);
}
