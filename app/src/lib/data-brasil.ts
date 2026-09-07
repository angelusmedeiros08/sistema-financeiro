// "Hoje" no fuso de Brasília — nunca `new Date().toISOString().slice(0, 10)`.
// O servidor roda em UTC (Vercel não define TZ por padrão) e Brasil é
// UTC-3: das 21h às 23h59 no horário de Brasília, a data corrida em UTC já
// é a de amanhã. Toda regra de negócio baseada em "hoje" (vencimento,
// recorrência, agregação por período, dedup de alerta diário) usa esta
// função — bug real, achado ao vivo (parcela mostrando vencimento de
// amanhã quando já tinha vencido hoje, cedo da noite).
export const FUSO_BRASIL = "America/Sao_Paulo";

const formatadorDataIso = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_BRASIL,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function hojeIsoBrasil(): string {
  return formatadorDataIso.format(new Date());
}

// Subtrai meses de uma data ISO (YYYY-MM-DD) preservando o dia quando o mês
// de destino o comporta, e caindo no último dia desse mês quando não (ex.:
// 31/03 menos 1 mês = 28/02, nunca "03/03" por overflow silencioso do
// `Date` nativo). Bug real, achado em auditoria: 4 pontos do sistema
// (Concentração, PMR/PMP, Distribuição por forma de pagamento, donuts da
// Central de Indicadores) duplicavam essa conta sem o clamp, encolhendo a
// janela "últimos N meses" sempre que hoje caía em dia 29-31 e o mês-alvo
// tinha menos dias.
export function isoMenosMeses(dataIso: string, meses: number): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const ultimoDiaMesAlvo = new Date(Date.UTC(ano, mes - meses, 0)).getUTCDate();
  const diaClampado = Math.min(dia, ultimoDiaMesAlvo);
  return new Date(Date.UTC(ano, mes - 1 - meses, diaClampado)).toISOString().slice(0, 10);
}
