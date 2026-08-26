// Decide pra onde um clique num gráfico leva — único lugar do sistema que
// sabe montar essa URL, pra nenhuma função de relatório reimplementar a
// lógica de "como vira um link" (ver spec 2026-08-25-drill-down-graficos).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";

type Cliente = SupabaseClient<Database>;

export type TipoEntidadeDrillDown = "pessoa" | "categoria" | "forma_pagamento" | "centro_custo";

export type DestinoDrillDown = { tipo: "pessoa"; href: string } | { tipo: "lancamentos"; href: string };

const PARAM_POR_TIPO: Record<TipoEntidadeDrillDown, string> = {
  pessoa: "pessoa_id",
  categoria: "categoria_id",
  forma_pagamento: "forma_pagamento_id",
  centro_custo: "centro_custo_id",
};

// entidadeId aceita 3 formas: um id (fatia nomeada normal), uma lista de ids
// (fatia "Outras", que o donut agrega quando há mais de 5 categorias/
// pessoas/formas) ou null (bucket "Não informado"/"Sem pessoa", sem id
// nenhum por trás). Só o caso de um único id de pessoa tem destino próprio
// (o extrato dela); todo o resto — lista, null, ou qualquer outro tipo de
// entidade — cai na tela genérica de Lançamentos filtrados.
export async function resolverDestinoDrillDown(
  supabase: Cliente,
  params: {
    tenantId: string;
    tipoEntidade: TipoEntidadeDrillDown;
    entidadeId: string | string[] | null;
    periodoInicio: string;
    periodoFim: string;
    origemHref: string;
  },
): Promise<DestinoDrillDown> {
  if (params.tipoEntidade === "pessoa" && typeof params.entidadeId === "string") {
    const href = await hrefDoExtratoPessoa(supabase, {
      tenantId: params.tenantId,
      pessoaId: params.entidadeId,
      origemHref: params.origemHref,
    });
    return { tipo: "pessoa", href };
  }

  const valorParam = Array.isArray(params.entidadeId) ? params.entidadeId.join(",") : (params.entidadeId ?? "nenhuma");
  const query = new URLSearchParams({
    [PARAM_POR_TIPO[params.tipoEntidade]]: valorParam,
    periodo_inicio: params.periodoInicio,
    periodo_fim: params.periodoFim,
    voltar: params.origemHref,
  });
  return { tipo: "lancamentos", href: `/lancamentos?${query.toString()}` };
}

// CLIENTE e FORNECEDOR/TRANSPORTADORA moram em telas separadas
// (/clientes/[pessoaId] vs /fornecedores/[pessoaId]) mesmo sendo a mesma
// tabela por baixo — uma pessoa com os dois perfis prioriza CLIENTE, porque
// todo gráfico que hoje leva a um clique de pessoa (concentração de
// receita) é sobre dinheiro entrando, contexto de cliente.
async function hrefDoExtratoPessoa(supabase: Cliente, params: { tenantId: string; pessoaId: string; origemHref: string }): Promise<string> {
  const { data: pessoa } = await supabase.from("pessoas").select("perfis").eq("id", params.pessoaId).eq("tenant_id", params.tenantId).maybeSingle();

  const caminhoBase = pessoa?.perfis?.includes("CLIENTE") ? "clientes" : "fornecedores";
  const query = new URLSearchParams({ voltar: params.origemHref });
  return `/${caminhoBase}/${params.pessoaId}?${query.toString()}`;
}
