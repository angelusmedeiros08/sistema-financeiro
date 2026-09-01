import { RelatoriosSubNav } from "./sub-nav";

// Título e sub-nav são estáticos em toda página de /relatorios (mesmo texto,
// mesmos links, sem fetch de dado) — mostrados de verdade aqui, não como
// skeleton, seguindo a regra de que conteúdo que não muda deve continuar
// real durante o loading (só o dado dinâmico vira skeleton). Compartilhado
// pelos 9 `loading.tsx` de relatório em vez de repetir o mesmo par de
// elementos em cada um.
export function CabecalhoRelatoriosCarregando() {
  return (
    <>
      <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
      <RelatoriosSubNav />
    </>
  );
}
