import "server-only";
import { chamarAsaas } from "./cliente-http";

export type ClienteAsaas = { id: string; name: string; email: string; cpfCnpj: string };
export type AssinaturaAsaas = { id: string; customer: string; externalReference: string | null };

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
