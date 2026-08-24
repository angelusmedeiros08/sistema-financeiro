import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/utils/supabase/database.types";

export const COOKIE_TENANT_ATIVO = "tenant_ativo";

type TenantDisponivel = { id: string; nome: string };

type ResultadoTenant =
  | { erro: string }
  | {
      user: User;
      tenantId: string;
      tenantNome: string;
      papel: Database["public"]["Enums"]["papel_usuario"];
      pessoaId: string | null;
      tenantsDisponiveis: TenantDisponivel[];
    };

// Um usuário pode ter vínculo ativo com mais de um tenant (ex.: sócio com
// empresa própria além da principal, ou futuro contador/BPO com vários
// clientes). O cookie tenant_ativo guarda qual desses o usuário escolheu por
// último — mas NUNCA é confiado como autorização por si só: todo acesso
// busca a lista real de vínculos ativos no banco (RLS aplicada) e só usa o
// valor do cookie se ele realmente bater com um vínculo existente. Cookie
// ausente, inválido, ou apontando pra tenant que o usuário não pertence mais
// cai no fallback de sempre — o primeiro vínculo ativo.
//
// cache() do React deduplica isto dentro de uma mesma renderização — o
// layout do app e a página filha podem chamar sem duplicar a viagem ao banco.
export const obterUsuarioETenantAtual = cache(async (): Promise<ResultadoTenant> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Não autenticado." };
  }

  const { data: vinculos, error } = await supabase
    .from("usuario_tenant")
    .select("tenant_id, papel, pessoa_id, tenants(nome)")
    .eq("usuario_id", user.id)
    .eq("ativo", true)
    .order("convidado_em");

  if (error || !vinculos || vinculos.length === 0) {
    return { erro: "Usuário sem empresa vinculada." };
  }

  const cookieStore = await cookies();
  const tenantIdPreferido = cookieStore.get(COOKIE_TENANT_ATIVO)?.value;
  const vinculoEscolhido = (tenantIdPreferido && vinculos.find((v) => v.tenant_id === tenantIdPreferido)) || vinculos[0];

  return {
    user,
    tenantId: vinculoEscolhido.tenant_id,
    tenantNome: vinculoEscolhido.tenants?.nome ?? "",
    papel: vinculoEscolhido.papel,
    pessoaId: vinculoEscolhido.pessoa_id,
    tenantsDisponiveis: vinculos.map((v) => ({ id: v.tenant_id, nome: v.tenants?.nome ?? "" })),
  };
});
