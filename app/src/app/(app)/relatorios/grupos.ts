// Fonte única dos itens de Relatórios — RelatoriosSubNav (pills agrupadas
// nas subtelas) e o menu lateral (sidebar.tsx) importam daqui, pra nunca
// divergir (mesmo padrão de configuracoes/grupos.ts).
export const GRUPOS_RELATORIOS = [
  {
    rotulo: "Geral",
    itens: [{ href: "/relatorios/visao-geral", rotulo: "Visão geral" }],
  },
  {
    rotulo: "Demonstrativos",
    itens: [
      { href: "/relatorios/dre", rotulo: "DRE" },
      { href: "/relatorios/dfc", rotulo: "DFC" },
    ],
  },
  {
    rotulo: "Análises",
    itens: [
      { href: "/relatorios/centro-custo", rotulo: "Centro de custo" },
      { href: "/relatorios/aging", rotulo: "Aging" },
      { href: "/relatorios/despesas", rotulo: "Análise de despesas" },
      { href: "/relatorios/ponto-equilibrio", rotulo: "Ponto de equilíbrio" },
      { href: "/relatorios/comparativos", rotulo: "Comparativos" },
    ],
  },
  {
    rotulo: "Contas",
    itens: [{ href: "/relatorios/contas-bancarias", rotulo: "Contas bancárias" }],
  },
] as const;
