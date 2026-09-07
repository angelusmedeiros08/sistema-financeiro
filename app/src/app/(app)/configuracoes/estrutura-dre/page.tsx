import { redirect } from "next/navigation";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarLinhasDreConfig } from "@/lib/relatorios/dre";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { NovaLinhaDreForm } from "./nova-linha-form";
import { LinhaDreItem } from "./linha-dre-item";
import { ModeloCompletoButton } from "./modelo-completo-button";
import { TituloPagina } from "@/components/layout/titulo-pagina";

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

  // Categoria sem nenhuma linha de DRE vinculada some silenciosamente de
  // toda a cascata (DRE, indicadores) e some do DFC Matriz — sem aparecer
  // nem como "não classificada" em lugar nenhum. Achado real em auditoria:
  // dezenas de milhares de reais de movimento ficaram invisíveis assim,
  // sem nenhum aviso na tela onde o vínculo é feito.
  const idsCategoriasVinculadas = new Set(linhas.flatMap((l) => l.categorias.map((c) => c.id)));
  const categoriasNaoVinculadas = (categorias ?? []).filter((c) => !idsCategoriasVinculadas.has(c.id));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <TituloPagina>Estrutura de DRE</TituloPagina>
        <ModeloCompletoButton />
      </div>

      <p className="text-sm text-muted-foreground">
        Cada linha <strong>Folha</strong> soma as categorias vinculadas a ela; cada linha <strong>Subtotal</strong>{" "}
        mostra o acumulado de tudo que veio antes, na ordem abaixo. A ordem e os vínculos definem tanto a DRE
        tabular quanto o gráfico em cascata de Relatórios.
      </p>

      {categoriasNaoVinculadas.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-[#C98A1F]/30 bg-[#C98A1F]/10 px-4 py-3 text-sm text-[#8A5E14] dark:text-[#F0BB4E]">
          <WarningCircle size={18} weight="bold" className="mt-0.5 shrink-0" />
          <p>
            <strong>{categoriasNaoVinculadas.length === 1 ? "1 categoria não está" : `${categoriasNaoVinculadas.length} categorias não estão`}</strong>{" "}
            vinculada{categoriasNaoVinculadas.length === 1 ? "" : "s"} a nenhuma linha de DRE — todo lançamento nela fica de fora da DRE, dos
            indicadores e da DFC, sem aparecer em nenhum total.{" "}
            {categoriasNaoVinculadas.map((c) => c.nome).join(", ")}. Vincule cada uma à linha certa abaixo.
          </p>
        </div>
      )}

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
