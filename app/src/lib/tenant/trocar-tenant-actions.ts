"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { COOKIE_TENANT_ATIVO } from "./atual";

// Troca o tenant ativo do usuário. Reconfirma no banco (RLS aplicada) que o
// usuário realmente tem vínculo ativo com o tenant pedido antes de gravar o
// cookie — nunca aceita o tenantId às cegas, mesmo vindo de um botão da
// própria UI (alguém poderia adulterar o form e mandar um id qualquer).
export async function trocarTenantAtivo(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  if (!tenantId) redirect("/painel");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: vinculo } = await supabase
    .from("usuario_tenant")
    .select("tenant_id")
    .eq("usuario_id", user.id)
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .maybeSingle();

  if (vinculo) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_TENANT_ATIVO, tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  redirect("/painel");
}
