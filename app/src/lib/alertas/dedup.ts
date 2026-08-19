import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";

type Cliente = SupabaseClient<Database>;
type TipoAlerta = Database["public"]["Enums"]["tipo_alerta"];

// Uma linha por (tenant, tipo, destinatário, dia) — se o cron rodar duas
// vezes no mesmo dia (retry manual, misfire), a segunda passada não manda
// e-mail de novo pra ninguém que já recebeu o de hoje.
export async function jaEnviadoHoje(
  supabase: Cliente,
  params: { tenantId: string; tipo: TipoAlerta; destinatarioId: string; referenciaData: string },
): Promise<boolean> {
  const { data } = await supabase
    .from("alertas_enviados")
    .select("id")
    .eq("tenant_id", params.tenantId)
    .eq("tipo", params.tipo)
    .eq("destinatario_id", params.destinatarioId)
    .eq("referencia_data", params.referenciaData)
    .maybeSingle();

  return data !== null;
}

export async function registrarEnvio(
  supabase: Cliente,
  params: { tenantId: string; tipo: TipoAlerta; destinatarioId: string; referenciaData: string },
): Promise<void> {
  await supabase.from("alertas_enviados").insert({
    tenant_id: params.tenantId,
    tipo: params.tipo,
    destinatario_id: params.destinatarioId,
    referencia_data: params.referenciaData,
  });
}
