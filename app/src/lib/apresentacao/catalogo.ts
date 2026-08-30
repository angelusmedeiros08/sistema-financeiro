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
  { rota: "/relatorios/visao-geral", rotulo: "Visão geral", categoria: "Relatórios" },
  { rota: "/relatorios/dre?aba=matriz", rotulo: "DRE — Matriz mensal", categoria: "Relatórios" },
  { rota: "/relatorios/dre?aba=cascata", rotulo: "DRE — Cascata", categoria: "Relatórios" },
  { rota: "/relatorios/dre?aba=indicadores", rotulo: "DRE — Indicadores", categoria: "Relatórios" },
  { rota: "/relatorios/dfc", rotulo: "DFC", categoria: "Relatórios" },
  { rota: "/relatorios/centro-custo", rotulo: "Centro de custo", categoria: "Relatórios" },
  { rota: "/relatorios/aging", rotulo: "Aging", categoria: "Relatórios" },
  { rota: "/relatorios/despesas", rotulo: "Análise de despesas", categoria: "Relatórios" },
  { rota: "/relatorios/ponto-equilibrio", rotulo: "Ponto de equilíbrio", categoria: "Relatórios" },
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
