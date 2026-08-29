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
  const params = new URLSearchParams({
    [PARAM_APRESENTACAO]: apresentacaoId,
    [PARAM_SLIDE]: String(indice),
    [PARAM_MODO]: modo,
  });
  if (pausado) params.set(PARAM_PAUSADO, "1");
  return `${rota}?${params.toString()}`;
}
