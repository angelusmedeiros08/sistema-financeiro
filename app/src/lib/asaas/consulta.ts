import "server-only";
import { chamarAsaas } from "./cliente-http";

export type ClienteAsaas = { id: string; name: string; email: string; cpfCnpj: string };
export type AssinaturaAsaas = { id: string; customer: string; externalReference: string | null; nextDueDate: string | null };
export type CobrancaAsaas = { id: string; status: string; invoiceUrl: string; dueDate: string };

// Buscados de propósito a partir da API (nunca confiados a partir do
// payload do webhook em si) — mais simples de auditar um único formato de
// resposta conhecido do que tentar validar todo campo que um payload de
// evento poderia ou não conter.
export async function buscarAssinaturaAsaas(subscriptionId: string): Promise<AssinaturaAsaas> {
  return chamarAsaas<AssinaturaAsaas>(`/v3/subscriptions/${subscriptionId}`);
}

export async function buscarClienteAsaas(customerId: string): Promise<ClienteAsaas> {
  return chamarAsaas<ClienteAsaas>(`/v3/customers/${customerId}`);
}

// Cobrança pendente/vencida mais recente da assinatura — é o `invoiceUrl`
// dela que vira o botão "Pagar agora" no autoatendimento (regularizar
// inadimplência) e "Ver última fatura" na tela de gerenciar assinatura.
// `invoiceUrl` é uma página hospedada do Asaas (aceita Pix/boleto/cartão
// conforme o método configurado) — mesmo princípio do checkout: nenhum
// dado de pagamento passa pelo nosso servidor.
export async function buscarCobrancaAtualAsaas(subscriptionId: string): Promise<CobrancaAsaas | null> {
  const resposta = await chamarAsaas<{ data: CobrancaAsaas[] }>(`/v3/payments?subscription=${subscriptionId}&limit=1`);
  return resposta.data[0] ?? null;
}

// DELETE não tem corpo de resposta relevante — se não lançar (chamarAsaas
// já converte qualquer status não-2xx em ErroAsaas), a assinatura foi
// cancelada no Asaas.
export async function cancelarAssinaturaAsaas(subscriptionId: string): Promise<void> {
  await chamarAsaas<unknown>(`/v3/subscriptions/${subscriptionId}`, { method: "DELETE" });
}
