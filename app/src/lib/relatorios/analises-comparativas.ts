import type { Cliente, Regime } from "./regime";
import { buscarMovimento, valorComSinal, chaveGranularidade } from "./regime";

export type TipoAnaliseComparativa = "AH" | "YOY" | "YTD";

export type PontoAnaliseComparativa = {
  chave: string;
  atual: number;
  comparacao: number;
  // null = sem base de comparação de verdade (mês anterior/ano anterior sem
  // movimento) — nunca confundir com "0% de variação de verdade" (achado em
  // auditoria de UX). YTD sempre manda 0 aqui de propósito: não representa
  // variação nenhuma, a coluna nem aparece pra esse tipo (ver
  // comparativos-tabela.tsx, `mostrarVariacao`).
  variacaoPercentual: number | null;
};

function somarPorMes(movimento: Awaited<ReturnType<typeof buscarMovimento>>): Map<string, number> {
  const porMes = new Map<string, number>();
  for (const linha of movimento) {
    const chave = chaveGranularidade(linha.data, "mes");
    porMes.set(chave, (porMes.get(chave) ?? 0) + valorComSinal(linha));
  }
  return porMes;
}

// AH (mês vs mês anterior), YoY (mesmo mês, ano anterior) e YTD (acumulado
// no ano) — as 3 leituras que a planilha alterna por slicer sobre a mesma
// medida base (Seção 3.7/6.7 do mapeamento), aqui como 3 ramos de uma
// função só, cada um consultando o resultado mensal já calculado.
export async function buscarAnaliseComparativa(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; tipo: TipoAnaliseComparativa; dataInicio: string; dataFim: string },
): Promise<PontoAnaliseComparativa[]> {
  const movimento = await buscarMovimento(supabase, params);
  const porMes = somarPorMes(movimento);
  const chaves = [...porMes.keys()].sort();

  if (params.tipo === "YTD") {
    let acumulado = 0;
    let anoAtual = "";
    return chaves.map((chave) => {
      const ano = chave.slice(0, 4);
      if (ano !== anoAtual) {
        acumulado = 0;
        anoAtual = ano;
      }
      const atual = porMes.get(chave)!;
      acumulado += atual;
      return { chave, atual, comparacao: acumulado, variacaoPercentual: 0 };
    });
  }

  if (params.tipo === "AH") {
    // Mês anterior por aritmética de calendário (mesmo padrão do ramo YOY
    // abaixo), nunca por índice em `chaves` — achado em auditoria: `chaves`
    // só lista meses COM movimento, então `chaves[i-1]` apontava pro último
    // mês com dado (2-3 meses atrás) sempre que havia um mês parado no meio
    // do período, rotulando um valor antigo como "mês anterior" sem avisar.
    // Mês anterior sem nenhum movimento cai em `anterior=0` -> `null`
    // (mesma semântica de "sem base de comparação" já usada no resto desta
    // função), nunca num valor de outro mês.
    return chaves.map((chave) => {
      const atual = porMes.get(chave)!;
      const [ano, mes] = chave.split("-").map(Number);
      const anoMesAnterior = mes === 1 ? ano - 1 : ano;
      const mesAnterior = mes === 1 ? 12 : mes - 1;
      const chaveMesAnterior = `${anoMesAnterior}-${String(mesAnterior).padStart(2, "0")}`;
      const anterior = porMes.get(chaveMesAnterior) ?? 0;
      return {
        chave,
        atual,
        comparacao: anterior,
        variacaoPercentual: anterior !== 0 ? (atual - anterior) / Math.abs(anterior) : null,
      };
    });
  }

  // YOY precisa do mesmo período no ano anterior — busca separada.
  const anoInicioAnterior = String(Number(params.dataInicio.slice(0, 4)) - 1);
  const anoFimAnterior = String(Number(params.dataFim.slice(0, 4)) - 1);
  const movimentoAnoAnterior = await buscarMovimento(supabase, {
    ...params,
    dataInicio: anoInicioAnterior + params.dataInicio.slice(4),
    dataFim: anoFimAnterior + params.dataFim.slice(4),
  });
  const porMesAnterior = somarPorMes(movimentoAnoAnterior);

  return chaves.map((chave) => {
    const atual = porMes.get(chave)!;
    const [ano, mes] = chave.split("-");
    const chaveAnoAnterior = `${Number(ano) - 1}-${mes}`;
    const comparacao = porMesAnterior.get(chaveAnoAnterior) ?? 0;
    return {
      chave,
      atual,
      comparacao,
      variacaoPercentual: comparacao !== 0 ? (atual - comparacao) / Math.abs(comparacao) : null,
    };
  });
}
