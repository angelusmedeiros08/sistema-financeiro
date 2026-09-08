import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/utils/supabase/database.types";
import { acessoLiberado } from "@/lib/pagamentos/plano";

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
      // Gate de assinatura (achado CRÍTICO em auditoria de segurança,
      // 29/08/2026): cada layout (app/portal) decide o que fazer com isso —
      // esta função só resolve o vínculo, não redireciona por si só, mesmo
      // padrão já usado pra `papel`.
      statusAssinatura: "trial" | "ativo" | "inadimplente" | "cancelado" | null;
      trialTerminaEm: string | null;
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
// layout do app e a página filha podem chamar sem duplicar a viagem ao banco
// (só quando chamados com o mesmo argumento — ver ignorarGateAssinatura).
//
// `ignorarGateAssinatura` existe só pros 3 lugares que precisam do status
// bruto mesmo com assinatura vencida: os 2 layouts (decidem pra onde
// redirecionar) e a própria tela de assinatura pendente (mostra a mensagem
// certa e manda de volta se o pagamento já confirmou). Todo o resto —
// literalmente toda Server Action do sistema, mais de 100 arquivos — chama
// sem esse parâmetro, e por isso agora é bloqueado automaticamente aqui.
//
// Achado ALTO em auditoria de segurança (08/09/2026): o gate de assinatura
// (criado numa auditoria anterior, 29/08) só existia nos layouts — uma
// Server Action chamada direto (fora da navegação normal da tela, ex. via
// requisição forjada reaproveitando uma sessão ainda válida de antes de
// cancelar) nunca era bloqueada, porque Server Actions não passam pelo
// layout pra executar. É a classe "subscription bypass", bem documentada em
// vulnerabilidades reais de SaaS. Centralizado aqui — o único lugar que
// todo o resto do sistema já chama primeiro — em vez de espalhar a checagem
// em mais de 100 arquivos, um por um, correndo risco de esquecer algum.
export const obterUsuarioETenantAtual = cache(async (ignorarGateAssinatura = false): Promise<ResultadoTenant> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Não autenticado." };
  }

  const { data: vinculos, error } = await supabase
    .from("usuario_tenant")
    .select("tenant_id, papel, pessoa_id, tenants(nome, status_assinatura, trial_termina_em)")
    .eq("usuario_id", user.id)
    .eq("ativo", true)
    .order("convidado_em");

  if (error || !vinculos || vinculos.length === 0) {
    return { erro: "Usuário sem empresa vinculada." };
  }

  const cookieStore = await cookies();
  const tenantIdPreferido = cookieStore.get(COOKIE_TENANT_ATIVO)?.value;
  const vinculoEscolhido = (tenantIdPreferido && vinculos.find((v) => v.tenant_id === tenantIdPreferido)) || vinculos[0];

  const statusAssinatura = (vinculoEscolhido.tenants?.status_assinatura as "trial" | "ativo" | "inadimplente" | "cancelado" | undefined) ?? null;
  const trialTerminaEm = vinculoEscolhido.tenants?.trial_termina_em ?? null;

  if (!ignorarGateAssinatura && !acessoLiberado(statusAssinatura, trialTerminaEm)) {
    return { erro: "Assinatura inativa ou período de teste encerrado. Regularize o pagamento para continuar." };
  }

  return {
    user,
    tenantId: vinculoEscolhido.tenant_id,
    tenantNome: vinculoEscolhido.tenants?.nome ?? "",
    papel: vinculoEscolhido.papel,
    pessoaId: vinculoEscolhido.pessoa_id,
    tenantsDisponiveis: vinculos.map((v) => ({ id: v.tenant_id, nome: v.tenants?.nome ?? "" })),
    statusAssinatura,
    trialTerminaEm,
  };
});
