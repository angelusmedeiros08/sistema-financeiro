// Catálogo fixo de telas elegíveis como slide (spec Seção 2,
// docs/superpowers/specs/2026-08-29-modo-apresentacao-design.md) — cada
// slide é uma tela que já existe no sistema, com dado ao vivo do tenant.
// Rota/rótulo espelham exatamente o que a Sidebar usa hoje
// (src/components/layout/sidebar.tsx).
export type CategoriaSlide = "Painel" | "Indicadores" | "Relatórios";

export type ItemCatalogo = {
  rota: string;
  rotulo: string;
  categoria: CategoriaSlide;
};

export const CATALOGO_SLIDES: ItemCatalogo[] = [
  { rota: "/painel", rotulo: "Painel", categoria: "Painel" },
  { rota: "/indicadores", rotulo: "Central de Indicadores", categoria: "Indicadores" },
  { rota: "/relatorios/visao-geral", rotulo: "Visão geral", categoria: "Relatórios" },
  { rota: "/relatorios/dre", rotulo: "DRE", categoria: "Relatórios" },
  { rota: "/relatorios/dfc", rotulo: "DFC", categoria: "Relatórios" },
  { rota: "/relatorios/centro-custo", rotulo: "Centro de custo", categoria: "Relatórios" },
  { rota: "/relatorios/aging", rotulo: "Aging", categoria: "Relatórios" },
  { rota: "/relatorios/despesas", rotulo: "Análise de despesas", categoria: "Relatórios" },
  { rota: "/relatorios/ponto-equilibrio", rotulo: "Ponto de equilíbrio", categoria: "Relatórios" },
  { rota: "/relatorios/comparativos", rotulo: "Comparativos", categoria: "Relatórios" },
  { rota: "/relatorios/contas-bancarias", rotulo: "Contas bancárias", categoria: "Relatórios" },
];

export function itemCatalogoDaRota(rota: string): ItemCatalogo | undefined {
  return CATALOGO_SLIDES.find((item) => item.rota === rota);
}

export function rotaValida(rota: string): boolean {
  return itemCatalogoDaRota(rota) !== undefined;
}
