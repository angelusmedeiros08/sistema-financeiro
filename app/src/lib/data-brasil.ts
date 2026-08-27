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
