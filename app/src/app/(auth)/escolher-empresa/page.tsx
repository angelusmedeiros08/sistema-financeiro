import { redirect } from "next/navigation";
import { Buildings } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { AuthShell } from "@/components/layout/auth-shell";
import { trocarTenantAtivo } from "@/lib/tenant/trocar-tenant-actions";

// Só existe pra quem tem mais de 1 vínculo ativo — quem tem só 1 nunca passa
// por aqui, entrar() já manda direto pro /painel. Reaproveita
// trocarTenantAtivo (mesma action do seletor no menu do avatar) como o
// action de cada botão, então a mesma revalidação contra o banco vale aqui.
export default async function PaginaEscolherEmpresa() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: vinculos } = await supabase
    .from("usuario_tenant")
    .select("tenant_id, tenants(nome)")
    .eq("usuario_id", user.id)
    .eq("ativo", true)
    .order("convidado_em");

  if (!vinculos || vinculos.length === 0) redirect("/entrar");
  if (vinculos.length === 1) redirect("/painel");

  return (
    <AuthShell titulo="Qual empresa?" subtitulo="Você tem acesso a mais de uma — escolha onde entrar.">
      <div className="space-y-2">
        {vinculos.map((v) => (
          <form key={v.tenant_id} action={trocarTenantAtivo}>
            <input type="hidden" name="tenant_id" value={v.tenant_id} />
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-card transition-colors hover:border-primary/40"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-muted text-muted-foreground">
                <Buildings size={17} weight="bold" />
              </span>
              <span className="truncate font-semibold text-foreground">{v.tenants?.nome ?? "—"}</span>
            </button>
          </form>
        ))}
      </div>
    </AuthShell>
  );
}
