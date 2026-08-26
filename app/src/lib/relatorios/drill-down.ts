// Decide pra onde um clique num gráfico leva — único lugar do sistema que
// sabe montar essa URL, pra nenhuma função de relatório reimplementar a
// lógica de "como vira um link" (ver spec 2026-08-25-drill-down-graficos).
//
// Pessoa já teve um destino próprio (o extrato dela em /clientes ou
// /fornecedores) — revertido: quem clica numa fatia de pessoa quer ver os
// lançamentos dela direto, não pousar na tela de cadastro (achado ao vivo,
// não em brainstorming). Todo tipo de entidade cai igual em /lancamentos.
export type TipoEntidadeDrillDown = "pessoa" | "categoria" | "forma_pagamento" | "centro_custo";

const PARAM_POR_TIPO: Record<TipoEntidadeDrillDown, string> = {
  pessoa: "pessoa_id",
  categoria: "categoria_id",
  forma_pagamento: "forma_pagamento_id",
  centro_custo: "centro_custo_id",
};

// entidadeId aceita 3 formas: um id (fatia nomeada normal), uma lista de ids
// (fatia "Outras", que o donut agrega quando há mais de 5 categorias/
// pessoas/formas) ou null (bucket "Não informado"/"Sem pessoa", sem id
// nenhum por trás). Sem chamada ao banco — pode rodar tanto no servidor
// quanto direto no componente de gráfico (client), pro caso da fatia
// "Outras" agregar ids que o servidor nunca viu juntos numa linha só.
export function montarHrefLancamentos(params: {
  tipoEntidade: TipoEntidadeDrillDown;
  entidadeId: string | string[] | null;
  periodoInicio: string;
  periodoFim: string;
  origemHref: string;
}): string {
  const valorParam = Array.isArray(params.entidadeId) ? params.entidadeId.join(",") : (params.entidadeId ?? "nenhuma");
  const query = new URLSearchParams({
    [PARAM_POR_TIPO[params.tipoEntidade]]: valorParam,
    periodo_inicio: params.periodoInicio,
    periodo_fim: params.periodoFim,
    voltar: params.origemHref,
  });
  return `/lancamentos?${query.toString()}`;
}
