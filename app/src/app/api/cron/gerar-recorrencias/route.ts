import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { gerarOcorrenciasPendentes } from "@/lib/contabil/recorrencia";

// Disparada pelo pg_cron do Supabase (via pg_net), nunca pelo navegador —
// autenticação é um segredo compartilhado, não sessão de usuário. Atravessa
// todos os tenants numa chamada só, por isso usa o client admin (service
// role) em vez do client de RLS comum.
function segredoValido(recebido: string | null): boolean {
  const esperado = process.env.CRON_SECRET;
  if (!recebido || !esperado) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!segredoValido(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const resultado = await gerarOcorrenciasPendentes(supabase);

  return NextResponse.json(resultado);
}
