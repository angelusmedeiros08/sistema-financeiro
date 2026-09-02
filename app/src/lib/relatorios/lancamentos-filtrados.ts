// Busca por trás da tela /lancamentos — destino de todo clique em gráfico
// (ver spec e plano 2026-08-25-drill-down-graficos). Categoria/centro de
// custo/pessoa reaproveitam `buscarMovimento` — a MESMA fonte que os
// gráficos de origem usam — em vez de reimplementar a soma; isso garante o
// total bater exato até nos detalhes que uma query própria esqueceria
// (regime escolhido pelo usuário, parcela cancelada excluída, valor não
// duplicado por parcela). Só forma de pagamento continua com query
// própria: sua fonte de verdade é `baixas.valor_pago`, não `buscarMovimento`
// (mesmo raciocínio de distribuicao-forma-pagamento.ts — nunca existiu
// "forma de pagamento" em regime previsto/competência).
import type { Cliente, MovimentoLinha, Regime } from "./regime";
import { buscarMovimento, valorComSinal } from "./regime";

export type LinhaLancamentoFiltrado = {
  id: string;
  descricao: string | null;
  valor_total: number;
  tipo: "RECEITA" | "DESPESA";
  parcelas: { status: string; data_vencimento: string }[];
  rateio_categoria: { categorias_financeiras: { nome: string } | null }[];
  // Fração do evento que corresponde ao filtro ativo — presente sempre que
  // o evento tem categoria dividida entre mais de uma linha de rateio, ou
  // forma de pagamento dividida entre baixas diferentes. Sem isso a linha
  // mostraria valor_total inteiro mesmo quando só uma parte do evento
  // pertence ao que foi clicado (ex.: R$ 600 pagos em Pix de um evento de
  // R$ 1.000 pago metade em Pix, metade em dinheiro).
  valorFiltrado: number;
};

// "nenhuma" = bucket "Não informado"/"Sem pessoa" (id nulo na origem);
// array com mais de 1 item = fatia "Outras" (vários ids agregados).
type ValorFiltro = string[] | "nenhuma";

// Union discriminada por `dimensao` — o caso sem dimensão (Saldo em caixa,
// Recebido/Pago do mês etc., ver spec 2026-08-26-painel-clicavel) não tem
// entidade nenhuma pra recortar nem pra derivar rótulo, então `rotulo` vem
// explícito de quem chama.
export type FiltroLancamentos =
  | {
      dimensao: "categoria" | "forma_pagamento" | "centro_custo" | "pessoa" | "conta_financeira";
      valor: ValorFiltro;
      // Ignorado por "forma_pagamento" — ver comentário no topo do arquivo.
      regime: Regime;
      // Presente quando a fatia clicada já era, ela mesma, só de um tipo
      // (ex.: "Entradas" de um centro de custo) — ver comentário em drill-down.ts.
      apenasTipo?: "RECEITA" | "DESPESA";
    }
  | {
      // Linha de DRE e atividade da DFC são, na prática, "um grupo nomeado
      // de categorias" — resolvidos pra uma lista de categoria ids antes
      // de chegar em buscarPorMovimento, com o nome vindo da própria linha/
      // atividade (nunca de "Outras categorias" genérico, nem de texto cru
      // da URL — ver spec 2026-09-02-drill-down-4a-leva).
      dimensao: "linha_dre";
      valor: string;
      regime: Regime;
      apenasTipo?: "RECEITA" | "DESPESA";
    }
  | {
      dimensao: "atividade_dfc";
      valor: "OPERACIONAL" | "INVESTIMENTO" | "FINANCIAMENTO";
      regime: Regime;
      apenasTipo?: "RECEITA" | "DESPESA";
    }
  | {
      dimensao?: undefined;
      regime: Regime;
      apenasTipo?: "RECEITA" | "DESPESA";
      rotulo: string;
    };

export type ResultadoLancamentosFiltrados = {
  // Só a página atual — paginação real no servidor (achado em auditoria de
  // escalabilidade, 30/08/2026): esta tela buscava o período inteiro sem
  // teto (era o próprio link "Todo o histórico" do Saldo em caixa), e
  // `buscarEventosPorId` fazia uma SEGUNDA busca completa por cima. `total`
  // e `quantidade` continuam agregando o PERÍODO INTEIRO (não só a página)
  // — são o saldo/contagem exibidos no topo da tela, precisam ficar certos
  // independente de quantas páginas existirem.
  linhas: LinhaLancamentoFiltrado[];
  total: number;
  quantidade: number;
  // Quantidade de EVENTOS distintos no período inteiro — é o que
  // `totalPaginas` pagina, não necessariamente igual a `quantidade` (que em
  // forma de pagamento conta baixas, podendo ter mais de uma por evento).
  // Usado pelo pager, não pelo chip "N lançamentos/pagamentos" da tela.
  totalEventos: number;
  totalPaginas: number;
  rotulo: string;
};

const SELECT_EVENTO = "id, descricao, valor_total, tipo, parcelas(status, data_vencimento), rateio_categoria(categorias_financeiras(nome))";
const VAZIO = (rotulo: string): ResultadoLancamentosFiltrados => ({ linhas: [], total: 0, quantidade: 0, totalEventos: 0, totalPaginas: 1, rotulo });

export async function buscarLancamentosFiltrados(
  supabase: Cliente,
  params: { tenantId: string; filtro: FiltroLancamentos; periodoInicio: string; periodoFim: string; pagina: number; tamanhoPagina: number },
): Promise<ResultadoLancamentosFiltrados> {
  const { tenantId, filtro, periodoInicio, periodoFim, pagina, tamanhoPagina } = params;
  switch (filtro.dimensao) {
    case undefined:
      return buscarTodoMovimento(supabase, tenantId, filtro.regime, periodoInicio, periodoFim, filtro.apenasTipo, filtro.rotulo, pagina, tamanhoPagina);
    case "forma_pagamento":
      return buscarPorFormaPagamento(supabase, tenantId, filtro.valor, periodoInicio, periodoFim, pagina, tamanhoPagina);
    case "categoria":
      return buscarPorMovimento(supabase, tenantId, filtro.valor, filtro.regime, periodoInicio, periodoFim, pagina, tamanhoPagina, {
        campo: "categoriaId",
        buscarRotulo: (id) => buscarNome(supabase, "categorias_financeiras", tenantId, id),
        rotuloNenhuma: "Sem categoria",
        rotuloVarios: "Outras categorias",
        apenasTipo: filtro.apenasTipo,
      });
    case "centro_custo":
      return buscarPorMovimento(supabase, tenantId, filtro.valor, filtro.regime, periodoInicio, periodoFim, pagina, tamanhoPagina, {
        campo: "centroCustoId",
        buscarRotulo: (id) => buscarNome(supabase, "centros_custo", tenantId, id),
        rotuloNenhuma: "Sem centro de custo",
        rotuloVarios: "Outros centros de custo",
        apenasTipo: filtro.apenasTipo,
      });
    case "pessoa":
      return buscarPorMovimento(supabase, tenantId, filtro.valor, filtro.regime, periodoInicio, periodoFim, pagina, tamanhoPagina, {
        campo: "pessoaId",
        buscarRotulo: (id) => buscarNome(supabase, "pessoas", tenantId, id),
        rotuloNenhuma: "Sem pessoa vinculada",
        rotuloVarios: "Outras pessoas",
        apenasTipo: filtro.apenasTipo,
      });
    case "conta_financeira":
      return buscarPorMovimento(supabase, tenantId, filtro.valor, filtro.regime, periodoInicio, periodoFim, pagina, tamanhoPagina, {
        campo: "contaFinanceiraId",
        buscarRotulo: (id) => buscarNome(supabase, "contas_financeiras", tenantId, id),
        rotuloNenhuma: "Sem conta vinculada",
        rotuloVarios: "Outras contas",
        apenasTipo: filtro.apenasTipo,
      });
    case "linha_dre": {
      const { ids, nome } = await categoriasDaLinhaDre(supabase, tenantId, filtro.valor);
      if (ids.length === 0) return VAZIO("-");
      return buscarPorMovimento(supabase, tenantId, ids, filtro.regime, periodoInicio, periodoFim, pagina, tamanhoPagina, {
        campo: "categoriaId",
        buscarRotulo: async () => nome,
        rotuloNenhuma: nome,
        rotuloVarios: nome,
        apenasTipo: filtro.apenasTipo,
      });
    }
    case "atividade_dfc": {
      const ids = await categoriasDaAtividade(supabase, tenantId, filtro.valor);
      const nome = ROTULO_ATIVIDADE[filtro.valor];
      if (ids.length === 0) return VAZIO(nome);
      return buscarPorMovimento(supabase, tenantId, ids, filtro.regime, periodoInicio, periodoFim, pagina, tamanhoPagina, {
        campo: "categoriaId",
        buscarRotulo: async () => nome,
        rotuloNenhuma: nome,
        rotuloVarios: nome,
        apenasTipo: filtro.apenasTipo,
      });
    }
  }
}

const ROTULO_ATIVIDADE: Record<"OPERACIONAL" | "INVESTIMENTO" | "FINANCIAMENTO", string> = {
  OPERACIONAL: "Atividades operacionais",
  INVESTIMENTO: "Atividades de investimento",
  FINANCIAMENTO: "Atividades de financiamento",
};

// Categorias que compõem uma linha de DRE (via linha_dre_categorias) — o
// nome vem da própria linha, nunca de "Outras categorias" genérico (uma
// linha de DRE é um agrupamento nomeado deliberado, não um resto de top-N).
async function categoriasDaLinhaDre(supabase: Cliente, tenantId: string, linhaId: string): Promise<{ ids: string[]; nome: string }> {
  const { data } = await supabase
    .from("linhas_dre")
    .select("rotulo, linha_dre_categorias(categoria_id)")
    .eq("tenant_id", tenantId)
    .eq("id", linhaId)
    .maybeSingle();
  if (!data) return { ids: [], nome: "-" };
  return { ids: data.linha_dre_categorias.map((c) => c.categoria_id), nome: data.rotulo };
}

// Mesmo dobramento de NAO_OPERACIONAL_* dentro de OPERACIONAL que
// buscarDFCMatriz (lib/relatorios/dfc.ts) já usa pra montar a matriz — as 3
// atividades continuam somando os MESMOS ids de categoria que a matriz
// mostrou, então o total bate exato.
async function categoriasDaAtividade(
  supabase: Cliente,
  tenantId: string,
  atividade: "OPERACIONAL" | "INVESTIMENTO" | "FINANCIAMENTO",
): Promise<string[]> {
  const { data: linhas } = await supabase
    .from("linhas_dre")
    .select("id_dfc, linha_dre_categorias(categoria_id)")
    .eq("tenant_id", tenantId)
    .not("id_dfc", "is", null);

  const ids: string[] = [];
  for (const linha of linhas ?? []) {
    if (!linha.id_dfc) continue;
    const dobrada = linha.id_dfc === "INVESTIMENTO" || linha.id_dfc === "FINANCIAMENTO" ? linha.id_dfc : "OPERACIONAL";
    if (dobrada !== atividade) continue;
    for (const c of linha.linha_dre_categorias) ids.push(c.categoria_id);
  }
  return ids;
}

// Ordena os eventos agregados pela data mais recente de movimento e recorta
// só os ids da página pedida — o total/quantidade já foram calculados sobre
// TODO o período antes disso (agregarMovimento), então recortar aqui não
// afeta esses dois números, só quantos eventos são hidratados/exibidos.
function paginarEventos(
  valorPorEvento: Map<string, number>,
  dataPorEvento: Map<string, string>,
  pagina: number,
  tamanhoPagina: number,
): { idsPagina: string[]; totalPaginas: number } {
  const idsOrdenados = [...valorPorEvento.keys()].sort((a, b) => (dataPorEvento.get(b) ?? "").localeCompare(dataPorEvento.get(a) ?? ""));
  const totalPaginas = Math.max(1, Math.ceil(idsOrdenados.length / tamanhoPagina));
  const inicio = (Math.max(1, pagina) - 1) * tamanhoPagina;
  return { idsPagina: idsOrdenados.slice(inicio, inicio + tamanhoPagina), totalPaginas };
}

async function buscarNome(
  supabase: Cliente,
  tabela: "categorias_financeiras" | "centros_custo" | "pessoas" | "formas_pagamento" | "contas_financeiras",
  tenantId: string,
  id: string,
): Promise<string> {
  const { data } = await supabase.from(tabela).select("nome").eq("id", id).eq("tenant_id", tenantId).maybeSingle();
  return data?.nome ?? "-";
}

// `eventoIds` já vem só com os ids da página (recortados por
// `paginarEventos`) — o `.in()` do PostgREST não garante devolver na mesma
// ordem da lista, por isso reordena pelo id depois de buscar, em vez de
// confiar na ordem da resposta.
async function buscarEventosPorId(
  supabase: Cliente,
  tenantId: string,
  eventoIds: string[],
  valorFiltradoPorEvento: Map<string, number>,
): Promise<LinhaLancamentoFiltrado[]> {
  if (eventoIds.length === 0) return [];
  const { data } = await supabase.from("eventos_financeiros").select(SELECT_EVENTO).eq("tenant_id", tenantId).in("id", eventoIds);
  const porId = new Map((data ?? []).map((e) => [e.id, e]));
  return eventoIds
    .map((id) => porId.get(id))
    .filter((e): e is NonNullable<typeof e> => e != null)
    .map((e) => ({ ...e, valorFiltrado: valorFiltradoPorEvento.get(e.id) ?? e.valor_total }));
}

// Compartilhado entre `buscarTodoMovimento` (sem dimensão) e
// `buscarPorMovimento` (categoria/centro de custo/pessoa) — sem isso, cada
// um tinha sua própria cópia do laço de agregação, e só um dos dois somava
// com sinal quando `apenasTipo` está ausente (achado em revisão de código:
// as duas cópias podiam divergir silenciosamente). Sem `apenasTipo` a lista
// pode misturar RECEITA e DESPESA (é o caso de "Saldo em caixa" e de
// categoria/centro/pessoa sem filtro de tipo) — "total" precisa ser o saldo
// líquido (com sinal), não a soma bruta dos dois lados (achado testando
// Saldo em caixa ao vivo: R$ 189.905,00 de volume ≠ R$ 76.026,00 de saldo).
// Com `apenasTipo`, todas as linhas já são do mesmo tipo — soma sem sinal,
// mesmo padrão que todo o resto do drill-down já usa (total sempre
// positivo, o chip "Só entradas"/"Só saídas" já comunica a direção).
function agregarMovimento(
  linhas: MovimentoLinha[],
  apenasTipo: "RECEITA" | "DESPESA" | undefined,
): { total: number; valorPorEvento: Map<string, number>; dataPorEvento: Map<string, string> } {
  const total = linhas.reduce((soma, l) => soma + (apenasTipo ? l.valor : valorComSinal(l)), 0);
  const valorPorEvento = new Map<string, number>();
  const dataPorEvento = new Map<string, string>();
  for (const l of linhas) {
    valorPorEvento.set(l.eventoFinanceiroId, (valorPorEvento.get(l.eventoFinanceiroId) ?? 0) + l.valor);
    // Data mais recente entre as linhas do mesmo evento (parcelado, ou
    // dividido entre categorias/centros) — mesmo critério de "mais recente
    // primeiro" que Despesas/Receitas já usam pra ordenar a lista.
    const atual = dataPorEvento.get(l.eventoFinanceiroId);
    if (!atual || l.data > atual) dataPorEvento.set(l.eventoFinanceiroId, l.data);
  }
  return { total, valorPorEvento, dataPorEvento };
}

// Sem dimensão nenhuma — todo o movimento de um regime/tipo/período, sem
// recortar por categoria/centro/pessoa (Saldo em caixa, Recebido/Pago do
// mês, Receitas/Despesas do mês, ver spec 2026-08-26-painel-clicavel). Não
// há entidade pra derivar rótulo, por isso `rotulo` vem de quem chama.
async function buscarTodoMovimento(
  supabase: Cliente,
  tenantId: string,
  regime: Regime,
  periodoInicio: string,
  periodoFim: string,
  apenasTipo: "RECEITA" | "DESPESA" | undefined,
  rotulo: string,
  pagina: number,
  tamanhoPagina: number,
): Promise<ResultadoLancamentosFiltrados> {
  const movimento = await buscarMovimento(supabase, { tenantId, regime, dataInicio: periodoInicio, dataFim: periodoFim });
  const linhas = movimento.filter((l) => !apenasTipo || l.tipo === apenasTipo);

  if (linhas.length === 0) return VAZIO(rotulo);

  const { total, valorPorEvento, dataPorEvento } = agregarMovimento(linhas, apenasTipo);
  const { idsPagina, totalPaginas } = paginarEventos(valorPorEvento, dataPorEvento, pagina, tamanhoPagina);
  return {
    linhas: await buscarEventosPorId(supabase, tenantId, idsPagina, valorPorEvento),
    total,
    quantidade: valorPorEvento.size,
    totalEventos: valorPorEvento.size,
    totalPaginas,
    rotulo,
  };
}

// categoria/centro de custo/pessoa: mesma forma de filtrar+somar, só muda
// qual campo do MovimentoLinha comparar e como achar o rótulo de exibição.
async function buscarPorMovimento(
  supabase: Cliente,
  tenantId: string,
  valor: ValorFiltro,
  regime: Regime,
  periodoInicio: string,
  periodoFim: string,
  pagina: number,
  tamanhoPagina: number,
  opcoes: {
    campo: "categoriaId" | "centroCustoId" | "pessoaId" | "contaFinanceiraId";
    buscarRotulo: (id: string) => Promise<string>;
    rotuloNenhuma: string;
    rotuloVarios: string;
    apenasTipo?: "RECEITA" | "DESPESA";
  },
): Promise<ResultadoLancamentosFiltrados> {
  const movimento = await buscarMovimento(supabase, { tenantId, regime, dataInicio: periodoInicio, dataFim: periodoFim });

  const linhas = movimento
    .filter((l) => !opcoes.apenasTipo || l.tipo === opcoes.apenasTipo)
    .filter((l) => (valor === "nenhuma" ? l[opcoes.campo] === null : l[opcoes.campo] !== null && valor.includes(l[opcoes.campo] as string)));

  // Resolvido ANTES do early-return de "sem resultado" — um centro de
  // custo/categoria real com 0 lançamentos no filtro (ex.: Entradas de um
  // centro que só teve despesa) ainda merece aparecer pelo nome de
  // verdade, não um "-" genérico (achado em revisão de código).
  const rotulo = valor === "nenhuma" ? opcoes.rotuloNenhuma : valor.length > 1 ? opcoes.rotuloVarios : await opcoes.buscarRotulo(valor[0]);

  if (linhas.length === 0) return VAZIO(rotulo);

  const { total, valorPorEvento, dataPorEvento } = agregarMovimento(linhas, opcoes.apenasTipo);
  const { idsPagina, totalPaginas } = paginarEventos(valorPorEvento, dataPorEvento, pagina, tamanhoPagina);

  return {
    linhas: await buscarEventosPorId(supabase, tenantId, idsPagina, valorPorEvento),
    total,
    quantidade: valorPorEvento.size,
    totalEventos: valorPorEvento.size,
    totalPaginas,
    rotulo,
  };
}

async function buscarPorFormaPagamento(
  supabase: Cliente,
  tenantId: string,
  valor: ValorFiltro,
  periodoInicio: string,
  periodoFim: string,
  pagina: number,
  tamanhoPagina: number,
): Promise<ResultadoLancamentosFiltrados> {
  let query = supabase
    .from("baixas")
    .select("valor_pago, forma_pagamento_id, data_pagamento, formas_pagamento(nome), parcelas!inner(evento_financeiro_id)")
    .eq("tenant_id", tenantId)
    .is("estornado_em", null)
    .gte("data_pagamento", periodoInicio)
    .lte("data_pagamento", periodoFim);
  query = valor === "nenhuma" ? query.is("forma_pagamento_id", null) : query.in("forma_pagamento_id", valor);

  const { data } = await query;
  const baixas = data ?? [];

  // valor.length checado ANTES de olhar o nome — uma "Outras" com 2+ ids
  // não pode virar o nome da primeira baixa só porque ela por acaso tem
  // nome (achado ao vivo: "Cartão" sozinho representando Cartão + Cartão de
  // Crédito juntos, escondendo que é um agregado). Resolvido a partir de
  // `formas_pagamento` direto (não de `baixas[0]`) pra não virar "-" numa
  // forma real que simplesmente não teve baixa no período (achado em
  // revisão de código).
  const rotulo =
    valor === "nenhuma"
      ? "Não informado"
      : valor.length > 1
        ? "Várias formas de pagamento"
        : await buscarNome(supabase, "formas_pagamento", tenantId, valor[0]);

  if (baixas.length === 0) return VAZIO(rotulo);

  const total = baixas.reduce((soma, b) => soma + Number(b.valor_pago), 0);
  const valorPorEvento = new Map<string, number>();
  const dataPorEvento = new Map<string, string>();
  for (const b of baixas) {
    const eventoId = b.parcelas!.evento_financeiro_id;
    valorPorEvento.set(eventoId, (valorPorEvento.get(eventoId) ?? 0) + Number(b.valor_pago));
    const atual = dataPorEvento.get(eventoId);
    if (!atual || b.data_pagamento > atual) dataPorEvento.set(eventoId, b.data_pagamento);
  }

  const { idsPagina, totalPaginas } = paginarEventos(valorPorEvento, dataPorEvento, pagina, tamanhoPagina);

  return {
    linhas: await buscarEventosPorId(supabase, tenantId, idsPagina, valorPorEvento),
    total,
    quantidade: baixas.length,
    totalEventos: valorPorEvento.size,
    totalPaginas,
    rotulo,
  };
}
