import type { Regime, Granularidade } from "./regime";
import { hojeIsoBrasil } from "@/lib/data-brasil";

export type ParametrosRelatorio = {
  regime: Regime;
  granularidade: Granularidade;
  dataInicio: string;
  dataFim: string;
};

function isoInicioDoMes(offsetMeses: number): string {
  const [ano, mes] = hojeIsoBrasil().split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1 + offsetMeses, 1)).toISOString().slice(0, 10);
}

const REGIMES: Regime[] = ["competencia", "previsto", "realizado"];
const GRANULARIDADES: Granularidade[] = ["dia", "semana", "mes", "trimestre", "ano"];
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const MESES_MAXIMO_INTERVALO = 24;

function dataIsoValida(bruto: string | undefined): string | null {
  return bruto && DATA_ISO.test(bruto) ? bruto : null;
}

// Teto de 24 meses de intervalo — achado em auditoria de escalabilidade
// (30/08/2026): nenhum relatório agrega no Postgres hoje, todos buscam
// linha crua de `buscarMovimento` e somam em JS; sem limite aqui, um link
// com `?data_inicio=` de anos atrás (compartilhado, digitado à mão, ou só
// curiosidade) faz cada um desses relatórios trafegar o histórico inteiro
// do tenant pro servidor a cada carregamento. Não impede consultar dado
// antigo — só limita quantos meses de uma vez, preservando `dataFim`
// (a ponta que a navegação normal move) e recuando `dataInicio`.
function clampIntervalo(dataInicio: string, dataFim: string): string {
  const limite = new Date(dataFim);
  limite.setUTCMonth(limite.getUTCMonth() - MESES_MAXIMO_INTERVALO);
  const limiteIso = limite.toISOString().slice(0, 10);
  return dataInicio < limiteIso ? limiteIso : dataInicio;
}

// Lê regime/granularidade/período da querystring da seção de Relatórios —
// URL como fonte da verdade (persiste ao navegar entre relatórios,
// compartilhável por link), com padrão de 6 meses até hoje quando nada foi
// informado.
export function lerParametrosRelatorio(searchParams: Record<string, string | undefined>): ParametrosRelatorio {
  const regime = REGIMES.includes(searchParams.regime as Regime) ? (searchParams.regime as Regime) : "competencia";
  const granularidade = GRANULARIDADES.includes(searchParams.granularidade as Granularidade)
    ? (searchParams.granularidade as Granularidade)
    : "mes";
  const dataFim = dataIsoValida(searchParams.data_fim) || hojeIsoBrasil();
  const dataInicioBruta = dataIsoValida(searchParams.data_inicio) || isoInicioDoMes(-5);
  const dataInicio = clampIntervalo(dataInicioBruta, dataFim);
  return { regime, granularidade, dataInicio, dataFim };
}
