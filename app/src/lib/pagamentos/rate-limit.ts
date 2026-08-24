import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";

// /assinar é rota pública sem sessão — só o service_role grava/lê
// tentativas_assinatura (RLS habilitada sem nenhuma policy, ver migration
// tentativas_assinatura_rate_limit). Ainda sem coletar dado de cartão, esse
// endpoint pode ser abusado pra spam de criação de tenant/customer no Asaas
// ou reconhecimento de e-mail — por isso limita por e-mail e por IP.
const JANELA_MS = 60 * 60 * 1000;
const LIMITE_POR_EMAIL = 3;
const LIMITE_POR_IP = 10;

// Registra a tentativa sempre, permitida ou não — senão dá pra "gastar" o
// limite tentando e nunca deixar rastro de quem estourou.
export async function registrarTentativaAssinatura(params: {
  email: string;
  ip: string;
}): Promise<{ permitido: boolean }> {
  const admin = createAdminClient();
  const desde = new Date(Date.now() - JANELA_MS).toISOString();

  const [porEmail, porIp] = await Promise.all([
    admin
      .from("tentativas_assinatura")
      .select("id", { count: "exact", head: true })
      .eq("email", params.email)
      .gte("criado_em", desde),
    admin
      .from("tentativas_assinatura")
      .select("id", { count: "exact", head: true })
      .eq("ip", params.ip)
      .gte("criado_em", desde),
  ]);

  const permitido = (porEmail.count ?? 0) < LIMITE_POR_EMAIL && (porIp.count ?? 0) < LIMITE_POR_IP;

  await admin.from("tentativas_assinatura").insert({ email: params.email, ip: params.ip });

  return { permitido };
}
