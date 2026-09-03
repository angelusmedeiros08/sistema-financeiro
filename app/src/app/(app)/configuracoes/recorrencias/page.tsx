import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { TabelaRecorrencias } from "./tabela-recorrencias";
import { TituloPagina } from "@/components/layout/titulo-pagina";

export default async function PaginaRecorrencias() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const { data: regras } = await supabase
    .from("regras_recorrencia")
    .select(
      "id, descricao, tipo, valor_total, unidade_intervalo, intervalo, data_inicio, numero_ocorrencias, data_fim, ocorrencias_geradas, ativa, ultima_geracao_em",
    )
    .eq("tenant_id", contexto.tenantId)
    .order("criado_em", { ascending: false });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <TituloPagina>Recorrências</TituloPagina>

      <section className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">Criadas ao marcar &quot;Repetir lançamento?&quot; numa despesa ou receita.</p>

        {!regras || regras.length === 0 ? (
          <EstadoVazio texto="Nenhuma série recorrente cadastrada ainda." />
        ) : (
          <TabelaRecorrencias regras={regras} />
        )}
      </section>
    </div>
  );
}
