import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";

// Mesmo padrão de lib/pagamentos/rate-limit.ts (tentativas_assinatura),
// generalizado pras 3 rotas de auth sem sessão que também são alvo de força
// bruta/enumeração/spam: login (senha errada repetida), cadastro (spam de
// tenant novo) e recuperação de senha (spam de e-mail). Achado em auditoria
// de segurança (30/08/2026): nenhuma das três tinha limite algum além do
// que o próprio Supabase Auth aplica por padrão.
export type FinalidadeTentativaAuth = "entrar" | "cadastro" | "recuperacao_senha" | "orcamento_publico" | "convite_aceitar";

const JANELA_MS = 15 * 60 * 1000;

// Pra "orcamento_publico" o campo `email` carrega o token do orçamento, não
// um e-mail de verdade — não há login nessa rota, o token é o único
// identificador de quem está tentando decidir.
const LIMITES: Record<FinalidadeTentativaAuth, { porEmail: number; porIp: number }> = {
  // Login errado de propósito (senha esquecida) é o caso comum mais
  // frequente entre os três — limite por e-mail mais folgado que os outros.
  entrar: { porEmail: 10, porIp: 30 },
  cadastro: { porEmail: 3, porIp: 10 },
  recuperacao_senha: { porEmail: 3, porIp: 10 },
  orcamento_publico: { porEmail: 5, porIp: 20 },
  // token_hash de alta entropia (não é código curto) — limite mais folgado
  // que cadastro/recuperação, é defesa em profundidade + rastro de
  // auditoria, não a proteção principal contra esse fluxo.
  convite_aceitar: { porEmail: 10, porIp: 30 },
};

// Registra a tentativa sempre, permitida ou não — senão dá pra "gastar" o
// limite tentando e nunca deixar rastro de quem estourou (mesmo raciocínio
// de registrarTentativaAssinatura).
export async function registrarTentativaAuth(params: {
  finalidade: FinalidadeTentativaAuth;
  email: string;
  ip: string;
}): Promise<{ permitido: boolean }> {
  const admin = createAdminClient();
  const desde = new Date(Date.now() - JANELA_MS).toISOString();
  const limite = LIMITES[params.finalidade];

  const [porEmail, porIp] = await Promise.all([
    admin
      .from("tentativas_auth")
      .select("id", { count: "exact", head: true })
      .eq("finalidade", params.finalidade)
      .eq("email", params.email)
      .gte("criado_em", desde),
    admin
      .from("tentativas_auth")
      .select("id", { count: "exact", head: true })
      .eq("finalidade", params.finalidade)
      .eq("ip", params.ip)
      .gte("criado_em", desde),
  ]);

  const permitido = (porEmail.count ?? 0) < limite.porEmail && (porIp.count ?? 0) < limite.porIp;

  await admin.from("tentativas_auth").insert({ finalidade: params.finalidade, email: params.email, ip: params.ip });

  return { permitido };
}

// Mesma extração de lib/pagamentos/assinatura-actions.ts — duplicada em vez
// de importada de lá porque é um helper de 3 linhas e as duas libs vivem em
// domínios diferentes (auth vs. pagamentos), sem uma razão real pra
// acoplar um ao outro só por isso.
export function obterIpDaRequisicao(cabecalhos: Headers): string {
  const encaminhado = cabecalhos.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0].trim();
  return cabecalhos.get("x-real-ip") ?? "desconhecido";
}
