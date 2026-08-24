import "server-only";

// Base fina de HTTP pro Asaas — único lugar que sabe a URL/autenticação da
// API. ASAAS_API_KEY nunca tem prefixo NEXT_PUBLIC_ (nunca vai pro bundle de
// cliente) e só é lida aqui dentro, em código server-only.
const BASE_URL = process.env.ASAAS_API_URL ?? "https://api-sandbox.asaas.com";

export class ErroAsaas extends Error {}

export async function chamarAsaas<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) throw new ErroAsaas("ASAAS_API_KEY não configurada.");

  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "SistemaFinanceiro/1.0",
      access_token: chave,
      ...opcoes.headers,
    },
  });

  const corpo = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    // Nunca repassar o corpo bruto do erro pro chamador sem filtrar — pode
    // conter detalhe interno da conta Asaas. Só a mensagem descritiva.
    const mensagem = corpo?.errors?.[0]?.description ?? `Asaas respondeu ${resposta.status}.`;
    throw new ErroAsaas(mensagem);
  }

  return corpo as T;
}
