import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarRegras } from "@/lib/conciliacao/regras";
import { ConfiguracoesSubNav } from "../sub-nav";
import { TabelaRegras } from "./tabela-regras";

export default async function PaginaRegrasCategorizacao() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();

  const [regras, { data: categorias }, { data: pessoas }] = await Promise.all([
    listarRegras(supabase, contexto.tenantId),
    supabase.from("categorias_financeiras").select("id, nome, tipo").eq("tenant_id", contexto.tenantId).order("nome"),
    supabase.from("pessoas").select("id, nome").eq("tenant_id", contexto.tenantId).order("nome"),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Regras de categorização</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Toda vez que você confirma uma categoria pra uma descrição do banco na conciliação, uma regra nasce sozinha e passa a sugerir a
          mesma categoria da próxima vez.
        </p>
      </div>
      <ConfiguracoesSubNav />

      <TabelaRegras regrasIniciais={regras} categorias={categorias ?? []} pessoas={pessoas ?? []} />
    </div>
  );
}
