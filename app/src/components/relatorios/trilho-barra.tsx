import { useId } from "react";

// Trilho de barra em SVG — primitivo compartilhado pelas listas rankeadas
// (aging, orçado×realizado, centro de custo, curva ABC), trocando a
// div-com-width-percentual por um traço vetorial real com fundo +
// preenchimento em gradiente, marcador de ponta e tooltip no hover — mesmo
// vocabulário visual dos outros gráficos migrados nesta sessão (gradiente
// de FluxoChart/IndicadoresDreChart, activeDot de círculo+anel branco).
//
// O hover funciona só com CSS (`group`/`group-hover`), sem estado nem
// listener de mouse — não precisa de "use client". `useId` também roda em
// server component, só precisa de um id estável por instância pra não
// colidir os `<linearGradient>` quando várias barras da mesma lista
// resolvem `url(#id)` pro primeiro elemento do documento com aquele id.
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
  valorFormatado,
}: {
  valorPercentual: number;
  cor: string;
  corFundo?: string;
  espessura?: number;
  /** Texto exato mostrado no tooltip ao passar o mouse (ex: "R$ 3.070,00"). Sem isso, cai pro percentual. */
  valorFormatado?: string;
}) {
  const idGradiente = useId();
  const percentualSeguro = Math.max(2, Math.max(0, Math.min(1, valorPercentual)) * 100);
  const raio = espessura / 2;
  const corEscura = `color-mix(in srgb, ${cor} 80%, black)`;
  const textoTooltip = valorFormatado ?? `${Math.round(percentualSeguro)}%`;

  return (
    <div className="group/trilho relative min-w-0 grow">
      <svg width="100%" height={espessura} className="block overflow-visible">
        <defs>
          <linearGradient id={idGradiente} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={corEscura} />
            <stop offset="100%" stopColor={cor} />
          </linearGradient>
        </defs>
        <rect width="100%" height={espessura} rx={raio} fill={corFundo} />
        <line x1="25%" x2="25%" y1={0} y2={espessura} stroke="var(--border)" strokeWidth={1} />
        <line x1="50%" x2="50%" y1={0} y2={espessura} stroke="var(--border)" strokeWidth={1} />
        <line x1="75%" x2="75%" y1={0} y2={espessura} stroke="var(--border)" strokeWidth={1} />
        <rect
          width={`${percentualSeguro}%`}
          height={espessura}
          rx={raio}
          fill={`url(#${idGradiente})`}
          style={{ transition: "width 0.5s ease-out" }}
        />
        <circle cx={`${percentualSeguro}%`} cy={espessura / 2} r={espessura / 2 + 1.5} fill={corEscura} stroke="var(--card)" strokeWidth={2} />
      </svg>

      <div
        className="pointer-events-none absolute bottom-full z-10 mb-2.5 -translate-x-1/2 rounded-md bg-[#1A1D1F] px-2.5 py-1.5 text-[11px] font-bold whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/trilho:opacity-100"
        style={{ left: `${percentualSeguro}%` }}
      >
        {textoTooltip}
        <div className="absolute top-full left-1/2 -mt-1 size-2 -translate-x-1/2 rotate-45 bg-[#1A1D1F]" />
      </div>
    </div>
  );
}
