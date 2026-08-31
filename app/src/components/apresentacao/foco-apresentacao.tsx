import { cn } from "@/lib/utils";

// Wrapper único pro "foco" das 5 telas apresentáveis com mais de um slide
// (Painel, Indicadores, Visão geral, Ponto de equilíbrio, DFC) — cada uma
// definia essa mesma casca de olho, com um max-width capado (3xl/4xl/5xl)
// que sobrava tela em qualquer apresentação de verdade (projetor, TV),
// cortando o gráfico antes mesmo dele decidir seu próprio tamanho.
//
// `estica`: pros focos que são um único gráfico grande (ex.: Fluxo de caixa,
// DRE em cascata) — o conteúdo ganha a altura real do slide (via ApresentacaoShell)
// em vez de só ficar centralizado no tamanho que teria dentro de um card
// normal. O conteúdo em si precisa cooperar (h-full/flex-1) — ver FluxoChart/
// WaterfallDre com a prop `apresentacao`. Focos que são grades de cartões
// (KPIs, gauges, donuts) não usam isso — centralizado e no tamanho natural
// já funciona bem pra eles, só ganham a largura extra do max-width removido.
export function FocoApresentacao({
  children,
  estica = false,
  className,
}: {
  children: React.ReactNode;
  estica?: boolean;
  className?: string;
}) {
  if (estica) {
    return <div className={cn("h-full min-h-[70vh] w-full", className)}>{children}</div>;
  }
  return <div className={cn("mx-auto flex min-h-[70vh] w-full items-center justify-center", className)}>{children}</div>;
}
