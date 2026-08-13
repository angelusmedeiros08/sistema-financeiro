import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/utils/supabase/database.types";

type ResultadoTenant =
  | { erro: string }
  | {
      user: User;
      tenantId: string;
      papel: Database["public"]["Enums"]["papel_usuario"];
    };

// Fase 0+1 ainda não tem seletor de tenant na UI — um usuário recém-cadastrado
// só pertence a 1 tenant (o que criou no cadastro). Quando o suporte a
// contador/BPO com múltiplas empresas entrar na UI, isto vira um seletor
// real em vez de "pegar o primeiro".
export async function obterUsuarioETenantAtual(): Promise<ResultadoTenant> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Não autenticado." };
  }

  const { data: vinculo, error } = await supabase
    .from("usuario_tenant")
    .select("tenant_id, papel")
    .eq("usuario_id", user.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (error || !vinculo) {
    return { erro: "Usuário sem empresa vinculada." };
  }

  return { user, tenantId: vinculo.tenant_id, papel: vinculo.papel };
}
