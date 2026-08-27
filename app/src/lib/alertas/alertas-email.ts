import "server-only";
import { criarTransportadorBrevo, detalheErroSmtp } from "@/lib/email/transportador-brevo";
import { formatarMoeda } from "@/lib/formatacao";
import type { ParcelaVencimento } from "./vencimentos";
import type { SaldoProjetado } from "@/lib/relatorios/saldo-projetado";

function formatarDataBR(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function linhaParcela(p: Pick<ParcelaVencimento, "descricao" | "dataVencimento" | "saldo">): string {
  return `<li>${p.descricao} — vence em ${formatarDataBR(p.dataVencimento)} — ${formatarMoeda(p.saldo)}</li>`;
}

// Um dígest por membro da equipe, só nos dias em que há algo a dizer —
// vencimentos dos dois lados (a pagar e a receber) e a ruptura de caixa
// como uma seção a mais dentro do mesmo e-mail, nunca um envio à parte.
export async function enviarResumoEquipe(params: {
  email: string;
  nome: string;
  aPagar: ParcelaVencimento[];
  aReceber: ParcelaVencimento[];
  saldoProjetado: SaldoProjetado;
}): Promise<{ sucesso: true } | { erro: string }> {
  const config = criarTransportadorBrevo();
  if ("erro" in config) return config;
  const { transportador, remetente } = config;

  const projecaoD7 = params.saldoProjetado.projecoes.find((p) => p.dias === 7);
  const emRuptura = projecaoD7?.ruptura ?? false;

  const secaoPagar =
    params.aPagar.length > 0
      ? `<h3 style="color: #111827; font-size: 14px;">A pagar</h3><ul style="color: #374151; font-size: 14px;">${params.aPagar.map(linhaParcela).join("")}</ul>`
      : "";
  const secaoReceber =
    params.aReceber.length > 0
      ? `<h3 style="color: #111827; font-size: 14px;">A receber</h3><ul style="color: #374151; font-size: 14px;">${params.aReceber.map(linhaParcela).join("")}</ul>`
      : "";
  const secaoRuptura = emRuptura
    ? `<p style="background: #fef2f2; color: #991b1b; padding: 12px 16px; border-radius: 10px; font-size: 14px;">
         ⚠️ Saldo projetado pra daqui 7 dias fica negativo: ${formatarMoeda(projecaoD7!.saldo)}.
       </p>`
    : "";

  try {
    await transportador.sendMail({
      from: `"Finanssi" <${remetente}>`,
      to: params.email,
      subject: "Resumo do dia — Finanssi",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111827;">Olá, ${params.nome}</h2>
          <p style="color: #374151; font-size: 14px;">Isso é o que precisa da sua atenção hoje.</p>
          ${secaoRuptura}
          ${secaoPagar}
          ${secaoReceber}
        </div>
      `,
    });
    return { sucesso: true };
  } catch (erro) {
    return { erro: detalheErroSmtp(erro, "Falha ao enviar resumo diário.") };
  }
}

// Cobrança educada — só menciona as parcelas da própria pessoa, nunca dado
// de outro cliente ou de despesa do tenant.
export async function enviarCobrancaCliente(params: {
  email: string;
  nome: string;
  parcelas: ParcelaVencimento[];
}): Promise<{ sucesso: true } | { erro: string }> {
  const config = criarTransportadorBrevo();
  if ("erro" in config) return config;
  const { transportador, remetente } = config;

  try {
    await transportador.sendMail({
      from: `"Finanssi" <${remetente}>`,
      to: params.email,
      subject: "Lembrete: sua parcela vence em breve",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111827;">Olá, ${params.nome}</h2>
          <p style="color: #374151; font-size: 14px;">Este é um lembrete de que a parcela abaixo vence em breve:</p>
          <ul style="color: #374151; font-size: 14px;">${params.parcelas.map(linhaParcela).join("")}</ul>
        </div>
      `,
    });
    return { sucesso: true };
  } catch (erro) {
    return { erro: detalheErroSmtp(erro, "Falha ao enviar lembrete de vencimento.") };
  }
}
