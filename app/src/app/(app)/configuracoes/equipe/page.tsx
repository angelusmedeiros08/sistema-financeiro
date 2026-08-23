import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { ConfiguracoesSubNav } from "../sub-nav";
import { ConvidarForm } from "./convidar-form";
import { TabelaEquipe } from "./tabela-equipe";

export default async function PaginaEquipe() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const [{ data: membros }, { data: clientes }] = await Promise.all([
    supabase
      .from("usuario_tenant")
      .select("usuario_id, papel, ativo, senha_definida, convidado_em, usuarios(nome, email)")
      .eq("tenant_id", contexto.tenantId)
      .order("convidado_em"),
    supabase
      .from("pessoas")
      .select("id, nome")
      .eq("tenant_id", contexto.tenantId)
      .contains("perfis", ["CLIENTE"])
      .order("nome"),
  ]);

  const souAdmin = contexto.papel === "admin";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Equipe</h1>
      <ConfiguracoesSubNav />

      {souAdmin && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Convidar</h2>
          <ConvidarForm clientes={clientes ?? []} />
        </section>
      )}

      <section>
        <TabelaEquipe membros={membros ?? []} souAdmin={souAdmin} usuarioAtualId={contexto.user.id} />
      </section>
    </div>
  );
}
