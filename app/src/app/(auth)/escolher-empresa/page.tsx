import { redirect } from "next/navigation";
import { Buildings, CaretRight } from "@phosphor-icons/react/dist/ssr";
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
    <AuthShell titulo="Qual empresa?" subtitulo="Você tem acesso a mais de uma empresa. Escolha onde entrar.">
      <div className="space-y-2.5">
        {vinculos.map((v) => (
          <form key={v.tenant_id} action={trocarTenantAtivo}>
            <input type="hidden" name="tenant_id" value={v.tenant_id} />
            <button
              type="submit"
              className="group flex w-full items-center gap-3 rounded-2xl border border-foreground/15 bg-card px-4 py-3.5 text-left shadow-card transition-all hover:border-primary/50 hover:shadow-[0_10px_30px_-16px_rgba(216,88,58,0.35)]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <Buildings size={17} weight="bold" />
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{v.tenants?.nome ?? "Empresa sem nome"}</span>
              <CaretRight size={16} className="shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </button>
          </form>
        ))}
      </div>
    </AuthShell>
  );
}
