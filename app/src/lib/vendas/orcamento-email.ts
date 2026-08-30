import "server-only";
import { criarTransportadorBrevo, detalheErroSmtp } from "@/lib/email/transportador-brevo";
import { escaparHtml } from "@/lib/email/escapar-html";

// Mesmo padrão de lib/tenant/convite-email.ts — best-effort: quem chama já
// gravou o dado de negócio (validade/token) antes desta chamada, então uma
// falha aqui nunca deve desfazer o envio do orçamento em si, só ficar
// registrada pro staff perceber que o cliente pode não ter recebido.
export async function enviarEmailOrcamento(params: {
  email: string;
  clienteNome: string;
  tenantNome: string;
  numeroVenda: number;
  valorFormatado: string;
  validadeFormatada: string;
  link: string;
  // Segunda notificação (proposta editada depois de já enviada) — mesmo
  // template, só o texto de abertura muda, pra não duplicar todo o HTML.
  atualizado?: boolean;
}): Promise<{ sucesso: true } | { erro: string }> {
  const config = criarTransportadorBrevo();
  if ("erro" in config) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[orcamento-email] SMTP não configurado — link do orçamento #${params.numeroVenda} pra ${params.email}:\n${params.link}`);
      return { sucesso: true };
    }
    return config;
  }
  const { transportador, remetente } = config;

  const clienteNome = escaparHtml(params.clienteNome);
  const tenantNome = escaparHtml(params.tenantNome);
  const assunto = params.atualizado
    ? `Orçamento #${params.numeroVenda} atualizado — ${params.tenantNome}`
    : `Orçamento #${params.numeroVenda} — ${params.tenantNome}`;
  const abertura = params.atualizado
    ? `A proposta <strong>#${params.numeroVenda}</strong> de <strong>${tenantNome}</strong> foi atualizada.`
    : `Você recebeu uma proposta comercial de <strong>${tenantNome}</strong>.`;

  try {
    await transportador.sendMail({
      from: `"Finanssi" <${remetente}>`,
      to: params.email,
      subject: assunto,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111827;">Orçamento #${params.numeroVenda}</h2>
          <p style="color: #374151; font-size: 15px; line-height: 1.5;">
            Olá, ${clienteNome}. ${abertura}
          </p>
          <p style="color: #374151; font-size: 15px; line-height: 1.5;">
            Valor total: <strong>${escaparHtml(params.valorFormatado)}</strong><br />
            Válido até: <strong>${escaparHtml(params.validadeFormatada)}</strong>
          </p>
          <p style="margin: 32px 0;">
            <a href="${params.link}"
               style="background: #157F6B; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600;">
              Ver orçamento
            </a>
          </p>
          <p style="color: #6b7280; font-size: 13px;">
            Se você não esperava este e-mail, pode ignorá-lo.
          </p>
        </div>
      `,
    });
    return { sucesso: true };
  } catch (erro) {
    return { erro: detalheErroSmtp(erro, "Falha ao enviar e-mail do orçamento.") };
  }
}
