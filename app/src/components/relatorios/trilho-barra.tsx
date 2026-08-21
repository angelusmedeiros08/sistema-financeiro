// Trilho de barra em SVG — primitivo compartilhado pelas listas rankeadas
// (aging, orçado×realizado, centro de custo, curva ABC), trocando a
// div-com-width-percentual por um traço vetorial real com fundo +
// preenchimento. Larguras em % (SVG aceita nativamente, resolvendo contra
// o viewport do próprio <svg>) — não precisa medir o container em JS,
// só um wrapper com `flex-1` já dá a largura certa.
//
// `min-w-0` é obrigatório aqui: um <svg width="100%"> como filho de
// flex tem largura "preferida" grande (resolve contra o ancestral
// definido mais próximo antes do flex aplicar a restrição), e sem
// min-w-0 o item recusa encolher abaixo disso (min-width:auto é o
// default do flexbox) — na prática o trilho ficava largo demais e
// empurrava o valor pra fora do card. Mesma causa-raiz do bug já
// corrigido no StatCard (valor de moeda vazando no mobile).
export function TrilhoBarra({
  valorPercentual,
  cor,
  corFundo = "var(--muted)",
  espessura = 8,
}: {
  valorPercentual: number;
  cor: string;
  corFundo?: string;
  espessura?: number;
}) {
  const percentualSeguro = Math.max(2, Math.max(0, Math.min(1, valorPercentual)) * 100);
  const raio = espessura / 2;

  return (
    <svg width="100%" height={espessura} className="block min-w-0 grow overflow-visible">
      <rect width="100%" height={espessura} rx={raio} fill={corFundo} />
      <rect width={`${percentualSeguro}%`} height={espessura} rx={raio} fill={cor} style={{ transition: "width 0.5s ease-out" }} />
    </svg>
  );
}
