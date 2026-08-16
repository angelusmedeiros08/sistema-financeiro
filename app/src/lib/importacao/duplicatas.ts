import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";

type Cliente = SupabaseClient<Database>;

// Consulta direta (sem coluna de hash — volume de um import não justifica)
// pra alimentar aplicarAvisosDuplicata() em validacao.ts. Só olha as datas
// de competência que aparecem no arquivo, então nunca varre a tabela toda.
export async function buscarChavesDuplicatas(supabase: Cliente, tenantId: string, datasCompetencia: string[]): Promise<Set<string>> {
  const datasUnicas = [...new Set(datasCompetencia)];
  if (datasUnicas.length === 0) return new Set();

  const { data } = await supabase
    .from("eventos_financeiros")
    .select("data_competencia, valor_total")
    .eq("tenant_id", tenantId)
    .in("data_competencia", datasUnicas);

  return new Set((data ?? []).map((e) => `${e.data_competencia}|${e.valor_total.toFixed(2)}`));
}
