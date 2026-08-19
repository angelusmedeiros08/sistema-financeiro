import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { dispararAlertasDiarios } from "@/lib/alertas/disparar";

// Disparada pelo pg_cron do Supabase (via pg_net), nunca pelo navegador —
// mesmo padrão de segredo compartilhado de /api/cron/gerar-recorrencias.
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
  const resultado = await dispararAlertasDiarios(supabase);

  return NextResponse.json(resultado);
}
