import type { Regime, Granularidade } from "./regime";

export type ParametrosRelatorio = {
  regime: Regime;
  granularidade: Granularidade;
  dataInicio: string;
  dataFim: string;
};

function isoHoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoInicioDoMes(offsetMeses: number): string {
  const data = new Date();
  data.setDate(1);
  data.setMonth(data.getMonth() + offsetMeses);
  return data.toISOString().slice(0, 10);
}

const REGIMES: Regime[] = ["competencia", "previsto", "realizado"];
const GRANULARIDADES: Granularidade[] = ["dia", "semana", "mes", "trimestre", "ano"];

// Lê regime/granularidade/período da querystring da seção de Relatórios —
// URL como fonte da verdade (persiste ao navegar entre relatórios,
// compartilhável por link), com padrão de 6 meses até hoje quando nada foi
// informado.
export function lerParametrosRelatorio(searchParams: Record<string, string | undefined>): ParametrosRelatorio {
  const regime = REGIMES.includes(searchParams.regime as Regime) ? (searchParams.regime as Regime) : "competencia";
  const granularidade = GRANULARIDADES.includes(searchParams.granularidade as Granularidade)
    ? (searchParams.granularidade as Granularidade)
    : "mes";
  const dataInicio = searchParams.data_inicio || isoInicioDoMes(-5);
  const dataFim = searchParams.data_fim || isoHoje();
  return { regime, granularidade, dataInicio, dataFim };
}
