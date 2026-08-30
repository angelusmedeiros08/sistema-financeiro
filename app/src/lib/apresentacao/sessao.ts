// Nome dos parâmetros de URL que carregam o estado de uma sessão de
// apresentação em andamento — mesmo padrão de estado-em-URL já usado no
// mecanismo de drill-down (lib/relatorios/drill-down.ts). `(app)/layout.tsx`
// lê esses parâmetros (spec Seção 6) pra decidir se suprime a
// Sidebar/Topbar/BotaoVoltar e troca pelo ApresentacaoShell.
export const PARAM_APRESENTACAO = "apresentacao";
export const PARAM_SLIDE = "slide";
export const PARAM_MODO = "modo";
export const PARAM_PAUSADO = "pausado";

export type ModoApresentacao = "apresentador" | "tv";

export function montarUrlSlide(
  rota: string,
  { apresentacaoId, indice, modo, pausado }: { apresentacaoId: string; indice: number; modo: ModoApresentacao; pausado?: boolean },
): string {
  // `rota` pode já trazer sua própria querystring (ex.: /relatorios/dre?aba=
  // cascata, pra apontar direto pra uma visão específica de uma tela) — sem
  // separar caminho e query aqui, um segundo "?" na URL final faria o
  // navegador tratar tudo depois do primeiro "?" como um valor só, quebrando
  // os dois conjuntos de parâmetro.
  const [caminho, queryDaRota] = rota.split("?");
  const params = new URLSearchParams(queryDaRota);
  params.set(PARAM_APRESENTACAO, apresentacaoId);
  params.set(PARAM_SLIDE, String(indice));
  params.set(PARAM_MODO, modo);
  if (pausado) params.set(PARAM_PAUSADO, "1");
  return `${caminho}?${params.toString()}`;
}

// Usado pelas próprias páginas de relatório/painel (Server Components, já
// recebem searchParams) pra esconder chrome de navegação PRÓPRIO da página
// (sub-nav entre relatórios, link "Configurar...", atalhos de CRUD) quando
// estão sendo mostradas como slide — feedback do usuário: a tela ainda
// parecia "print da tela normal" mesmo com Sidebar/Topbar já escondidos,
// porque cada página tem sua própria navegação embutida no conteúdo.
// Controles que afetam o DADO exibido (Regime, Ano, Período) continuam
// sempre visíveis — só o que é navegação pura some.
export function emModoApresentacao(sp: Record<string, string | string[] | undefined>): boolean {
  return sp[PARAM_APRESENTACAO] !== undefined;
}
