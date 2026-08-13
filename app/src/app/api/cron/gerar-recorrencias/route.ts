import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { gerarOcorrenciasPendentes } from "@/lib/contabil/recorrencia";

// Disparada pelo pg_cron do Supabase (via pg_net), nunca pelo navegador —
// autenticação é um segredo compartilhado, não sessão de usuário. Atravessa
// todos os tenants numa chamada só, por isso usa o client admin (service
// role) em vez do client de RLS comum.
export async function POST(request: Request) {
  const segredo = request.headers.get("x-cron-secret");
  if (!segredo || segredo !== process.env.CRON_SECRET) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const resultado = await gerarOcorrenciasPendentes(supabase);

  return NextResponse.json(resultado);
}
