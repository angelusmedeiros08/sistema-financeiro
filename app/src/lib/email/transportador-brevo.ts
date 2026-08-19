import "server-only";
import nodemailer from "nodemailer";

// Setup único do SMTP Brevo, compartilhado por todo e-mail transacional do
// app (convite, alertas de vencimento/ruptura) — extraído daqui na hora em
// que o segundo consumidor apareceu, pra não duplicar a validação de env.
export function criarTransportadorBrevo(): { transportador: nodemailer.Transporter; remetente: string } | { erro: string } {
  const host = process.env.BREVO_SMTP_HOST;
  const usuario = process.env.BREVO_SMTP_USER;
  const senha = process.env.BREVO_SMTP_PASSWORD;
  // Remetente de verdade (precisa ser um e-mail verificado no Brevo, em
  // "Remetentes, domínio, IPs") — nunca o login de autenticação SMTP, que é
  // só uma credencial interna e não uma identidade de remetente autorizada.
  const remetente = process.env.BREVO_SENDER_EMAIL;

  if (!host || !usuario || !senha || !remetente) {
    return { erro: "SMTP não configurado (BREVO_SMTP_HOST/USER/PASSWORD/SENDER_EMAIL)." };
  }

  const transportador = nodemailer.createTransport({
    host,
    port: 587,
    secure: false,
    auth: { user: usuario, pass: senha },
  });

  return { transportador, remetente };
}

export function detalheErroSmtp(erro: unknown, mensagemPadrao: string): string {
  // Inclui a resposta bruta do servidor SMTP quando disponível — é o
  // detalhe que realmente diz por que o Brevo recusou (remetente não
  // verificado, autenticação, etc.), não só "falha ao enviar".
  const detalhe = erro && typeof erro === "object" && "response" in erro ? String((erro as { response?: unknown }).response) : undefined;
  const mensagem = erro instanceof Error ? erro.message : mensagemPadrao;
  return detalhe ? `${mensagem} — ${detalhe}` : mensagem;
}
