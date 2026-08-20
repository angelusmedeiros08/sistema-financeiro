import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarLinhasDreConfig } from "@/lib/relatorios/dre";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { ConfiguracoesSubNav } from "../sub-nav";
import { NovaLinhaDreForm } from "./nova-linha-form";
import { LinhaDreItem } from "./linha-dre-item";
import { ModeloCompletoButton } from "./modelo-completo-button";

export default async function PaginaEstruturaDre() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();

  const [linhas, { data: categorias }] = await Promise.all([
    listarLinhasDreConfig(supabase, { tenantId: contexto.tenantId }),
    supabase
      .from("categorias_financeiras")
      .select("id, nome, tipo")
      .eq("tenant_id", contexto.tenantId)
      .order("nome"),
  ]);

  const todasIdsEmOrdem = linhas.map((l) => l.id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Estrutura de DRE</h1>
        <ModeloCompletoButton />
      </div>
      <ConfiguracoesSubNav />

      <p className="text-sm text-muted-foreground">
        Cada linha <strong>Folha</strong> soma as categorias vinculadas a ela; cada linha <strong>Subtotal</strong>{" "}
        mostra o acumulado de tudo que veio antes, na ordem abaixo. A ordem e os vínculos definem tanto a DRE
        tabular quanto o gráfico em cascata de Relatórios.
      </p>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Nova linha</h2>
        <NovaLinhaDreForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Linhas cadastradas</h2>

        {linhas.length === 0 ? (
          <EstadoVazio texto="Nenhuma linha de DRE cadastrada ainda." />
        ) : (
          linhas.map((linha, i) => (
            <LinhaDreItem
              key={linha.id}
              linha={linha}
              ehPrimeira={i === 0}
              ehUltima={i === linhas.length - 1}
              todasIdsEmOrdem={todasIdsEmOrdem}
              categoriasDisponiveis={(categorias ?? []).filter(
                (c) => !linha.categorias.some((vinculada) => vinculada.id === c.id),
              )}
            />
          ))
        )}
      </section>
    </div>
  );
}
