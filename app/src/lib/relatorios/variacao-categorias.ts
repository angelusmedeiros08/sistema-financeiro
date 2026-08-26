import type { Cliente } from "./regime";
import type { Database } from "@/utils/supabase/database.types";
import { buscarAnaliseCategorias } from "./analise-despesas";
import { mesAtual } from "./indicadores-gauge";

type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];

export type LinhaVariacaoCategoria = {
  categoriaId: string;
  nome: string;
  valorMesAtual: number;
  valorMesAnterior: number;
  variacaoPercentual: number;
};

function mesAnterior(): { inicio: string; fim: string } {
  const hoje = new Date();
  const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1));
  const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 0));
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

// "Onde meu dinheiro está indo, e o que mudou" — mesma curva ABC de
// analise-despesas.ts, rodada duas vezes (mês corrente × mês anterior) e
// ordenada pelo maior desvio, não pelo maior valor: uma categoria estável
// de R$50.000 não é acionável, uma que dobrou é.
export async function buscarVariacaoCategorias(
  supabase: Cliente,
  params: { tenantId: string; tipo: TipoCategoria },
): Promise<LinhaVariacaoCategoria[]> {
  const atual = mesAtual();
  const anterior = mesAnterior();

  // origemHref exigido pela assinatura mas nunca usado — esta lista
  // (ListaVariacaoCategorias) não é um donut clicável.
  const [linhasAtual, linhasAnterior] = await Promise.all([
    buscarAnaliseCategorias(supabase, { tenantId: params.tenantId, regime: "competencia", dataInicio: atual.inicio, dataFim: atual.fim, tipo: params.tipo, origemHref: "/indicadores" }),
    buscarAnaliseCategorias(supabase, { tenantId: params.tenantId, regime: "competencia", dataInicio: anterior.inicio, dataFim: anterior.fim, tipo: params.tipo, origemHref: "/indicadores" }),
  ]);

  const anteriorPorId = new Map(linhasAnterior.map((l) => [l.categoriaId, l.total]));
  const idsVistos = new Set(linhasAtual.map((l) => l.categoriaId));

  const linhas: LinhaVariacaoCategoria[] = linhasAtual.map((l) => {
    const valorMesAnterior = anteriorPorId.get(l.categoriaId) ?? 0;
    const variacaoPercentual = valorMesAnterior > 0 ? (l.total - valorMesAnterior) / valorMesAnterior : l.total > 0 ? 1 : 0;
    return { categoriaId: l.categoriaId, nome: l.categoriaNome, valorMesAtual: l.total, valorMesAnterior, variacaoPercentual };
  });

  for (const l of linhasAnterior) {
    if (idsVistos.has(l.categoriaId)) continue;
    linhas.push({ categoriaId: l.categoriaId, nome: l.categoriaNome, valorMesAtual: 0, valorMesAnterior: l.total, variacaoPercentual: -1 });
  }

  return linhas.sort((a, b) => Math.abs(b.variacaoPercentual) - Math.abs(a.variacaoPercentual));
}
