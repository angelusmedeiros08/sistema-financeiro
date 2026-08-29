import "server-only";
import { criarTransportadorBrevo, detalheErroSmtp } from "@/lib/email/transportador-brevo";
import { escaparHtml } from "@/lib/email/escapar-html";

const ROTULO_PAPEL: Record<string, string> = {
  admin: "Admin",
  financeiro_senior: "Financeiro sênior",
  financeiro_junior: "Financeiro júnior",
  contador: "Contador",
  cliente_portal: "Cliente (portal)",
};

// Envia o e-mail de convite pelo próprio app em vez de deixar o Supabase
// mandar automaticamente (inviteUserByEmail) — o e-mail do Supabase linca
// direto pro endpoint de verificação dele, que consome o token de uso único
// com um simples GET. Scanners de segurança de e-mail visitam esse link
// sozinhos e gastam o token antes do clique real da pessoa convidada.
// Mandando a gente mesmo, o link aponta pra uma página nossa que só
// consome o token quando a pessoa clica de verdade num botão.
export async function enviarEmailConvite(params: {
  email: string;
  tenantNome: string;
  papel: string;
  linkAceite: string;
}): Promise<{ sucesso: true } | { erro: string }> {
  const config = criarTransportadorBrevo();
  if ("erro" in config) {
    // Fora de produção, SMTP real (Brevo) não costuma estar configurado —
    // sem esse desvio, ninguém consegue testar o fluxo de convite
    // localmente sem credencial de verdade. O convite em si (conta de auth
    // + vínculo com o tenant) já foi criado antes desta chamada; só o
    // envio do e-mail é pulado, com o link impresso no console pra copiar
    // e colar manualmente.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[convite-email] SMTP não configurado — link de aceite pra ${params.email}:\n${params.linkAceite}`);
      return { sucesso: true };
    }
    return config;
  }
  const { transportador, remetente } = config;

  const rotuloPapel = escaparHtml(ROTULO_PAPEL[params.papel] ?? params.papel);
  const tenantNome = escaparHtml(params.tenantNome);

  try {
    await transportador.sendMail({
      from: `"Finanssi" <${remetente}>`,
      to: params.email,
      subject: `Convite para ${params.tenantNome}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111827;">Você foi convidado</h2>
          <p style="color: #374151; font-size: 15px; line-height: 1.5;">
            Você foi convidado para acessar o sistema financeiro de <strong>${tenantNome}</strong>
            como <strong>${rotuloPapel}</strong>.
          </p>
          <p style="margin: 32px 0;">
            <a href="${params.linkAceite}"
               style="background: #157F6B; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600;">
              Aceitar convite
            </a>
          </p>
          <p style="color: #6b7280; font-size: 13px;">
            Se você não esperava este convite, pode ignorar este e-mail.
          </p>
        </div>
      `,
    });
    return { sucesso: true };
  } catch (erro) {
    return { erro: detalheErroSmtp(erro, "Falha ao enviar e-mail de convite.") };
  }
}
