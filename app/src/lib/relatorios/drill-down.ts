// Decide pra onde um clique num gráfico leva — único lugar do sistema que
// sabe montar essa URL, pra nenhuma função de relatório reimplementar a
// lógica de "como vira um link" (ver spec 2026-08-25-drill-down-graficos).
//
// Pessoa já teve um destino próprio (o extrato dela em /clientes ou
// /fornecedores) — revertido: quem clica numa fatia de pessoa quer ver os
// lançamentos dela direto, não pousar na tela de cadastro (achado ao vivo,
// não em brainstorming). Todo tipo de entidade cai igual em /lancamentos.
import type { Regime } from "./regime";

export type TipoEntidadeDrillDown = "pessoa" | "categoria" | "forma_pagamento" | "centro_custo";

const PARAM_POR_TIPO: Record<TipoEntidadeDrillDown, string> = {
  pessoa: "pessoa_id",
  categoria: "categoria_id",
  forma_pagamento: "forma_pagamento_id",
  centro_custo: "centro_custo_id",
};

// Base comum às duas variantes de destino (com dimensão e sem) — regime,
// período, tipo opcional e o link de volta são sempre os mesmos 4 campos;
// cada variante só acrescenta o que a distingue (dimensão ou rótulo).
function montarQueryBase(params: { regime: Regime; tipo?: "RECEITA" | "DESPESA"; periodoInicio: string; periodoFim: string; origemHref: string }): URLSearchParams {
  const query = new URLSearchParams({
    regime: params.regime,
    periodo_inicio: params.periodoInicio,
    periodo_fim: params.periodoFim,
    voltar: params.origemHref,
  });
  if (params.tipo) query.set("tipo", params.tipo);
  return query;
}

// entidadeId aceita 3 formas: um id (fatia nomeada normal), uma lista de ids
// (fatia "Outras", que o donut agrega quando há mais de 5 categorias/
// pessoas/formas) ou null (bucket "Não informado"/"Sem pessoa", sem id
// nenhum por trás). Sem chamada ao banco — pode rodar tanto no servidor
// quanto direto no componente de gráfico (client), pro caso da fatia
// "Outras" agregar ids que o servidor nunca viu juntos numa linha só.
//
// `regime` é ignorado pela dimensão forma_pagamento (sempre baseada em
// baixas.data_pagamento — "realizado" por natureza, não tem "previsto"
// nem "competência") — carregado do mesmo jeito por simplicidade de
// contrato, não porque toda dimensão precisa dele.
//
// `tipo` existe pra quando a fatia clicada já é, ela mesma, só uma fatia
// de RECEITA ou só de DESPESA dentro da dimensão (ex.: "Entradas" e
// "Saídas" de um centro de custo são duas fatias diferentes do mesmo
// centro; sem o filtro, o total de /lancamentos somaria as duas juntas —
// maior que qualquer uma das fatias, quebrando a garantia de bater exato).
// Categoria/forma de pagamento nunca precisam disso (já são
// type-exclusivas por natureza); pessoa precisa sempre que o gráfico de
// origem também for (Concentração de Receita só soma RECEITA).
export function montarHrefLancamentos(params: {
  tipoEntidade: TipoEntidadeDrillDown;
  entidadeId: string | string[] | null;
  regime: Regime;
  tipo?: "RECEITA" | "DESPESA";
  periodoInicio: string;
  periodoFim: string;
  origemHref: string;
}): string {
  const valorParam = Array.isArray(params.entidadeId) ? params.entidadeId.join(",") : (params.entidadeId ?? "nenhuma");
  const query = montarQueryBase(params);
  query.set(PARAM_POR_TIPO[params.tipoEntidade], valorParam);
  return `/lancamentos?${query.toString()}`;
}

// Variante sem dimensão nenhuma — todo o movimento de um regime/tipo/
// período, sem recortar por categoria/centro/pessoa (Saldo em caixa,
// Recebido/Pago do mês, Receitas/Despesas do mês do Painel; ver spec
// 2026-08-26-painel-clicavel). Sem entidade pra derivar rótulo, por isso
// `rotulo` é obrigatório e viaja na própria URL.
export function montarHrefLancamentosSemDimensao(params: {
  regime: Regime;
  tipo?: "RECEITA" | "DESPESA";
  periodoInicio: string;
  periodoFim: string;
  rotulo: string;
  origemHref: string;
}): string {
  const query = montarQueryBase(params);
  query.set("rotulo", params.rotulo);
  return `/lancamentos?${query.toString()}`;
}
