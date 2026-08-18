import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Database } from "@/utils/supabase/database.types";

type Cliente = SupabaseClient<Database>;
type PapelUsuario = Database["public"]["Enums"]["papel_usuario"];

// Convida por e-mail (API administrativa do Supabase Auth, service_role —
// mesma infraestrutura de cadastrar()) e vincula ao tenant com o papel
// escolhido. O INSERT em usuario_tenant roda no client normal (RLS-scoped)
// do próprio chamador, nunca no admin client — a policy de INSERT já exige
// papel admin, então a garantia real de "só admin convida" é o banco, não
// só o `if (papel !== "admin")` abaixo (que só evita gastar um convite de
// e-mail de verdade numa tentativa que ia falhar de qualquer jeito).
export async function convidarUsuario(
  supabase: Cliente,
  params: {
    tenant_id: string;
    email: string;
    papel: PapelUsuario;
    papelChamador: PapelUsuario;
    pessoa_id?: string;
  },
): Promise<{ sucesso: true } | { erro: string }> {
  if (params.papelChamador !== "admin") {
    return { erro: "Só administradores podem convidar." };
  }
  if (params.papel === "cliente_portal" && !params.pessoa_id) {
    return { erro: "Selecione a pessoa vinculada a este acesso de portal." };
  }

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(params.email, {
    data: { nome: params.email },
    redirectTo: `${siteUrl}/auth/confirm?next=/convite/definir-senha`,
  });

  if (erroConvite || !convite.user) {
    // mensagem genérica de propósito — o texto nativo do Supabase Auth
    // pode revelar se esse e-mail já tem conta em OUTRO tenant da mesma
    // plataforma, vazando informação entre clientes da SaaS.
    return { erro: "Não foi possível enviar o convite. Confirme o e-mail e tente novamente." };
  }

  // já era membro (convite repetido, ou reingresso): reativa e atualiza o
  // papel em vez de tentar inserir de novo e colidir com a chave composta.
  const { data: vinculoExistente } = await supabase
    .from("usuario_tenant")
    .select("usuario_id")
    .eq("usuario_id", convite.user.id)
    .eq("tenant_id", params.tenant_id)
    .maybeSingle();

  if (vinculoExistente) {
    const { error: erroUpdate } = await supabase
      .from("usuario_tenant")
      .update({ papel: params.papel, ativo: true, pessoa_id: params.pessoa_id ?? null })
      .eq("usuario_id", convite.user.id)
      .eq("tenant_id", params.tenant_id);

    if (erroUpdate) return { erro: erroUpdate.message };
    return { sucesso: true };
  }

  const { error: erroVinculo } = await supabase.from("usuario_tenant").insert({
    usuario_id: convite.user.id,
    tenant_id: params.tenant_id,
    papel: params.papel,
    pessoa_id: params.pessoa_id ?? null,
  });

  if (erroVinculo) return { erro: erroVinculo.message };
  return { sucesso: true };
}

// Cancela um convite que nunca foi aceito (usuário nunca definiu senha).
// Precisa apagar tanto o vínculo com o tenant quanto a conta de auth —
// supabase.auth.admin.inviteUserByEmail() rejeita convidar de novo um
// e-mail que já existe em auth.users (mesmo não confirmado, error_code
// email_exists), então só remover o vínculo não bastaria pra liberar um
// reenvio. auth.users é global no projeto (compartilhado entre tenants),
// então só apaga a conta se esse usuário não tiver vínculo em mais
// nenhum tenant.
export async function cancelarConvitePendente(
  supabase: Cliente,
  params: { tenant_id: string; usuario_id: string; papelChamador: PapelUsuario },
): Promise<{ sucesso: true } | { erro: string }> {
  if (params.papelChamador !== "admin") {
    return { erro: "Só administradores podem cancelar convites." };
  }

  const { error: erroVinculo } = await supabase
    .from("usuario_tenant")
    .delete()
    .eq("tenant_id", params.tenant_id)
    .eq("usuario_id", params.usuario_id);

  if (erroVinculo) return { erro: erroVinculo.message };

  const admin = createAdminClient();
  const { count } = await admin
    .from("usuario_tenant")
    .select("tenant_id", { count: "exact", head: true })
    .eq("usuario_id", params.usuario_id);

  if (!count) {
    await admin.auth.admin.deleteUser(params.usuario_id);
  }

  return { sucesso: true };
}

export async function definirAcessoUsuario(
  supabase: Cliente,
  params: { tenant_id: string; usuario_id: string; ativo: boolean; papelChamador: PapelUsuario },
): Promise<{ sucesso: true } | { erro: string }> {
  if (params.papelChamador !== "admin") {
    return { erro: "Só administradores podem revogar ou reativar acesso." };
  }

  const { error } = await supabase
    .from("usuario_tenant")
    .update({ ativo: params.ativo })
    .eq("tenant_id", params.tenant_id)
    .eq("usuario_id", params.usuario_id);

  if (error) return { erro: error.message };
  return { sucesso: true };
}
