import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarCamposPersonalizados } from "@/lib/pessoas/buscar-pessoa";
import { NovoCampoForm } from "./novo-campo-form";
import { TabelaCamposPersonalizados } from "./tabela-campos-personalizados";
import { TituloPagina } from "@/components/layout/titulo-pagina";

export default async function PaginaCamposPersonalizados() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const campos = await listarCamposPersonalizados(supabase, { tenant_id: contexto.tenantId });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <TituloPagina>Campos personalizados</TituloPagina>
      <p className="text-sm text-muted-foreground">
        Campos adicionais que aparecem no cadastro de clientes e fornecedores, além dos que já vêm no sistema.
      </p>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Novo campo</h2>
        <NovoCampoForm />
      </section>

      <section>
        <TabelaCamposPersonalizados campos={campos} />
      </section>
    </div>
  );
}
