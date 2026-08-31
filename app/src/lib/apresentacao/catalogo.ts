// Catálogo fixo de telas elegíveis como slide (spec Seção 2,
// docs/superpowers/specs/2026-08-29-modo-apresentacao-design.md) — cada
// slide é uma tela (ou uma visão específica de uma tela, via querystring)
// que já existe no sistema, com dado ao vivo do tenant.
export type CategoriaSlide = "Painel" | "Indicadores" | "Relatórios";

export type ItemCatalogo = {
  rota: string;
  rotulo: string;
  categoria: CategoriaSlide;
};

export const CATALOGO_SLIDES: ItemCatalogo[] = [
  { rota: "/painel", rotulo: "Painel — Visão completa", categoria: "Painel" },
  { rota: "/painel?foco=saldo-caixa", rotulo: "Painel — Saldo em caixa", categoria: "Painel" },
  { rota: "/painel?foco=resultado-mes", rotulo: "Painel — Resultado do mês", categoria: "Painel" },
  { rota: "/painel?foco=fluxo-caixa", rotulo: "Painel — Fluxo de caixa", categoria: "Painel" },
  { rota: "/painel?foco=indicadores-realizacao", rotulo: "Painel — Indicadores de realização", categoria: "Painel" },
  { rota: "/indicadores", rotulo: "Indicadores — Visão completa", categoria: "Indicadores" },
  { rota: "/indicadores?foco=saldo-projetado", rotulo: "Indicadores — Saldo projetado", categoria: "Indicadores" },
  { rota: "/indicadores?foco=concentracao", rotulo: "Indicadores — Concentração de receita e despesa", categoria: "Indicadores" },
  { rota: "/indicadores?foco=variacao-categorias", rotulo: "Indicadores — Variação de categorias", categoria: "Indicadores" },
  { rota: "/indicadores?foco=prazos-aging", rotulo: "Indicadores — Prazos médios e aging", categoria: "Indicadores" },
  { rota: "/indicadores?foco=forma-pagamento", rotulo: "Indicadores — Distribuição por forma de pagamento", categoria: "Indicadores" },
  { rota: "/indicadores?foco=liquidez", rotulo: "Indicadores — Liquidez e ciclo de caixa", categoria: "Indicadores" },
  { rota: "/relatorios/visao-geral", rotulo: "Visão geral — Completa", categoria: "Relatórios" },
  { rota: "/relatorios/visao-geral?foco=kpis", rotulo: "Visão geral — KPIs principais", categoria: "Relatórios" },
  { rota: "/relatorios/visao-geral?foco=indicadores-realizacao", rotulo: "Visão geral — Indicadores de realização", categoria: "Relatórios" },
  { rota: "/relatorios/visao-geral?foco=fluxo-caixa", rotulo: "Visão geral — Fluxo de caixa", categoria: "Relatórios" },
  { rota: "/relatorios/visao-geral?foco=dre-cascata", rotulo: "Visão geral — DRE em cascata", categoria: "Relatórios" },
  { rota: "/relatorios/visao-geral?foco=top-categorias", rotulo: "Visão geral — Top categorias", categoria: "Relatórios" },
  { rota: "/relatorios/visao-geral?foco=aging", rotulo: "Visão geral — Aging", categoria: "Relatórios" },
  { rota: "/relatorios/dre?aba=matriz", rotulo: "DRE — Matriz mensal", categoria: "Relatórios" },
  { rota: "/relatorios/dre?aba=cascata", rotulo: "DRE — Cascata", categoria: "Relatórios" },
  { rota: "/relatorios/dre?aba=indicadores", rotulo: "DRE — Indicadores", categoria: "Relatórios" },
  { rota: "/relatorios/dfc", rotulo: "DFC — Completa", categoria: "Relatórios" },
  { rota: "/relatorios/dfc?foco=composicao", rotulo: "DFC — Composição do fluxo de caixa", categoria: "Relatórios" },
  { rota: "/relatorios/dfc?foco=matriz", rotulo: "DFC — Matriz (Previsto × Realizado)", categoria: "Relatórios" },
  { rota: "/relatorios/centro-custo", rotulo: "Centro de custo", categoria: "Relatórios" },
  { rota: "/relatorios/aging", rotulo: "Aging", categoria: "Relatórios" },
  { rota: "/relatorios/despesas", rotulo: "Análise de despesas", categoria: "Relatórios" },
  { rota: "/relatorios/ponto-equilibrio", rotulo: "Ponto de equilíbrio — Completo", categoria: "Relatórios" },
  { rota: "/relatorios/ponto-equilibrio?foco=atual", rotulo: "Ponto de equilíbrio — Atual", categoria: "Relatórios" },
  { rota: "/relatorios/ponto-equilibrio?foco=evolucao", rotulo: "Ponto de equilíbrio — Evolução no ano", categoria: "Relatórios" },
  { rota: "/relatorios/comparativos", rotulo: "Comparativos", categoria: "Relatórios" },
  { rota: "/relatorios/contas-bancarias", rotulo: "Contas bancárias", categoria: "Relatórios" },
];

function caminhoDe(rota: string): string {
  return rota.split("?")[0];
}

export function itemCatalogoDaRota(rota: string): ItemCatalogo | undefined {
  return CATALOGO_SLIDES.find((item) => item.rota === rota);
}

export function rotaValida(rota: string): boolean {
  return itemCatalogoDaRota(rota) !== undefined;
}

// Usado pelo AppChromeShell pra decidir SE a rota atual pode virar uma
// sessão de apresentação — usePathname() nunca inclui querystring, então
// aqui a comparação é só pelo caminho (sem ?aba=/?foco=), diferente de
// rotaValida (que compara a rota completa salva no slide, com querystring
// quando o catálogo aponta pra uma visão específica de uma tela).
export function caminhoElegivel(pathname: string): boolean {
  return CATALOGO_SLIDES.some((item) => caminhoDe(item.rota) === pathname);
}

// Usado pelo ícone de transmitir do Topbar — acha a entrada do catálogo que
// melhor representa o que a pessoa está vendo agora. Só olha pra `foco`/`aba`
// (os únicos dois parâmetros que o catálogo usa pra distinguir uma visão
// específica) — outros parâmetros de filtro que a tela normal já tenha na
// URL (regime, período, etc.) nunca aparecem no catálogo, então são
// ignorados de propósito, não tratados como "não bateu". Cai pro caminho
// puro se existir uma entrada assim (ex.: /painel), senão pra primeira
// entrada daquele caminho no catálogo (ex.: DRE, que só tem variantes com
// ?aba=, nunca uma entrada "tela inteira").
export function rotaAtualParaApresentar(pathname: string, searchParams: URLSearchParams): string | undefined {
  const foco = searchParams.get("foco");
  const aba = searchParams.get("aba");
  const candidatos = [foco ? `${pathname}?foco=${foco}` : null, aba ? `${pathname}?aba=${aba}` : null, pathname].filter(
    (r): r is string => r !== null,
  );

  for (const candidato of candidatos) {
    if (rotaValida(candidato)) return candidato;
  }
  return CATALOGO_SLIDES.find((item) => caminhoDe(item.rota) === pathname)?.rota;
}
