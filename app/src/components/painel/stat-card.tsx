import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowUpRight, ArrowDownRight, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";

// Gradiente diagonal no card "hero" + chip de ícone em cor arco-íris por
// variante removidos (achado em varredura de design, 03/09/2026: cor
// decorativa sem relação com o dado é o tell mais citado). Cor vira sinal
// só onde significa algo (delta positivo/negativo) — "hero" (o número mais
// importante da tela) se distingue por uma borda de destaque na cor de
// marca, não por preenchimento; as outras variantes ficam idênticas entre
// si (o nome da variante hoje só documenta a intenção original do card).
const cartaoVariantes = cva(
  "group/stat relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 text-card-foreground",
  {
    variants: {
      variant: {
        hero: "border-l-[3px] border-l-primary",
        sage: "",
        coral: "",
        ambar: "",
        teal: "",
        roxo: "",
        azul: "",
      },
    },
    defaultVariants: { variant: "sage" },
  },
);

type IconType = React.ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill"; className?: string }>;

type StatCardProps = VariantProps<typeof cartaoVariantes> & {
  label: React.ReactNode;
  valor: string;
  detalhe?: string;
  delta?: number;
  serie?: number[];
  icon?: IconType;
  // Só relevante com `href` e só obrigatório na prática quando `label` não
  // é string (ex.: envolvido em TermoComDica) — o `<Link>` do card vira um
  // overlay sem conteúdo visível (ver comentário em cima do branch
  // `if (href)`), então precisa de um nome acessível explícito; não dá pra
  // derivar de um ReactNode arbitrário.
  ariaLabel?: string;
} & (
    | {
        // Card vira link pros lançamentos/relatório que compõem o número —
        // pedido direto de um vídeo do sócio do usuário ("ver o total →
        // entender o que forma aquele total"). Sem href, comportamento
        // idêntico ao de antes.
        href?: string;
        children?: undefined;
      }
    | {
        // Mutuamente exclusivo com `href` — o wrapper com `href` vira um
        // `<Link>` (uma tag `<a>`); `children` com link próprio dentro de um
        // `<a>` já existente é HTML inválido (âncora aninhada), então o tipo
        // não deixa combinar os dois (achado em revisão de código).
        href?: undefined;
        // Conteúdo extra depois do sparkline — usado quando o número do
        // card é uma subtração (ex.: Resultado do mês) e não pode virar
        // link ele mesmo, mas as duas parcelas que o compõem podem
        // (Receitas/Despesas do mês).
        children?: React.ReactNode;
      }
  );

export function StatCard({ label, valor, detalhe, variant, delta, serie, icon: Icon, href, ariaLabel, children }: StatCardProps) {
  const v = variant ?? "sage";
  const deltaPositivo = typeof delta === "number" && delta >= 0;
  const corDelta = deltaPositivo ? "text-positivo" : "text-destructive";
  const corSpark = deltaPositivo ? "var(--positivo)" : "var(--destructive)";

  const conteudo = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className={cn("flex size-8 shrink-0 items-center justify-center", v === "hero" ? "text-primary" : "text-muted-foreground")}>
              <Icon size={18} weight="bold" />
            </span>
          )}
          <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{label}</span>
        </div>
        {typeof delta === "number" && (
          <span className={cn("flex items-center gap-0.5 text-xs font-bold tabular-nums", corDelta)}>
            {deltaPositivo ? <ArrowUpRight size={13} weight="bold" /> : <ArrowDownRight size={13} weight="bold" />}
            {Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
          </span>
        )}
      </div>

      {/* text-lg na base (não text-2xl) — a grade fica 2 colunas já em
          375px (grid-cols-2, só vira 4 a partir de lg), e um valor de 5-6
          dígitos em text-2xl não cabia numa linha: break-words então
          quebrava bem no meio, entre a vírgula e os centavos ("R$ 69.368"
          numa linha, "00" sozinho embaixo) — achado testando em mobile.
          sm: sobe o tamanho porque ali a grade continua 2 colunas (mais
          espaço por cartão). lg: NÃO sobe mais — a grade pula pra 4
          colunas exatamente nesse breakpoint, e com a sidebar fixa cada
          cartão fica tão estreito quanto (ou mais que) no mobile, então
          um valor maior lá voltaria a quebrar em duas linhas (achado
          medindo a largura real do cartão em 1280px: ~147px de conteúdo,
          menor que os ~26px de fonte pediam). */}
      <span className="min-w-0 break-words font-heading text-lg font-bold leading-tight tracking-tight tabular-nums sm:text-2xl lg:text-xl">
        {valor}
      </span>

      {detalhe && <span className="text-xs font-medium text-muted-foreground">{detalhe}</span>}

      {serie && serie.length > 1 && (
        <div className="-mx-1 mt-1 h-9">
          <Sparkline dados={serie} cor={corSpark} />
        </div>
      )}

      {children}

      {href && (
        <ArrowRight
          size={14}
          weight="bold"
          className={
            // group-focus-visible além do hover — sem isso, quem navega
            // por teclado nunca vê a pista de "isto é clicável" que o
            // mouse recebe (achado na auditoria de acessibilidade).
            "absolute right-4 bottom-4 text-muted-foreground opacity-0 transition-opacity group-hover/stat:opacity-100 group-focus-visible/stat:opacity-100"
          }
        />
      )}
    </>
  );

  if (href) {
    // Link vira um overlay cobrindo o card inteiro (`absolute inset-0`),
    // não um wrapper em volta de `conteudo` — um card com TermoComDica no
    // label aninharia um <button> dentro do <a>, o que navegadores tratam
    // como HTML inválido: a árvore de acessibilidade colapsa o botão
    // interno, tornando-o inalcançável por teclado/leitor de tela (achado
    // ao vivo testando o ícone de dica dentro deste card). `conteudo` fica
    // por cima (`pointer-events-none`, `display: contents` pra não quebrar
    // o layout flex) — clique em qualquer área sem elemento interativo cai
    // no Link por baixo; só o `<button>` do TermoComDica reativa os
    // próprios eventos de ponteiro e intercepta o clique antes do Link.
    //
    // `-z-10` no Link é essencial, não cosmético: um elemento posicionado
    // (`absolute`) sem z-index pinta ACIMA de conteúdo estático/normal por
    // padrão nas regras de empilhamento do CSS, mesmo vindo antes no DOM —
    // sem o z-index negativo, o Link ficava fisicamente por cima do botão
    // do TermoComDica e capturava o clique de qualquer jeito, apesar do
    // pointer-events-none/auto já estarem corretos (achado ao vivo: o
    // ícone navegava pro relatório em vez de abrir o popover).
    //
    // `isolate` no container é igualmente essencial: sem criar um contexto
    // de empilhamento PRÓPRIO aqui, `-z-10` compara o Link contra o que
    // for a ancestralidade real de contexto mais próxima (potencialmente
    // muito acima na árvore) — na prática, o Link ficava atrás até do
    // PRÓPRIO fundo deste card, e clicar em qualquer lugar do cartão (não
    // só no ícone) parava de navegar (achado ao vivo, via
    // `document.elementFromPoint`: o clique resolvia pro `<div>` externo,
    // nunca alcançava nem o conteúdo nem o Link). `isolate` limita a
    // comparação de z-index aos filhos diretos deste card.
    return (
      <div className={cn(cartaoVariantes({ variant }), "relative isolate transition-colors hover:border-primary/40")}>
        <Link
          href={href}
          aria-label={ariaLabel ?? (typeof label === "string" ? `${label}: ${valor}` : valor)}
          className="absolute inset-0 -z-10"
        />
        <div className="pointer-events-none contents">{conteudo}</div>
      </div>
    );
  }

  return <div className={cn(cartaoVariantes({ variant }))}>{conteudo}</div>;
}
