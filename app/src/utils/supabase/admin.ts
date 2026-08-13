import "server-only"; // erro de build se este arquivo for importado por código de cliente

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Cliente com service_role — ignora RLS por completo. Só para operação
// privilegiada e explícita (provisionar tenant no cadastro, convidar
// usuário). Nunca usar para ler/gravar dado em nome de um usuário comum —
// isso é papel do cliente de src/utils/supabase/server.ts, que respeita RLS.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada — necessária para operações administrativas.",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
