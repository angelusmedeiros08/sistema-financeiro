import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowUpRight, ArrowDownRight, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";

const cartaoVariantes = cva("group/stat relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5", {
  variants: {
    variant: {
      hero: "bg-gradient-to-br from-[#D8583A] to-[#A87C1F] text-white shadow-card",
      sage: "bg-card text-card-foreground shadow-card",
      coral: "bg-card text-card-foreground shadow-card",
      ambar: "bg-card text-card-foreground shadow-card",
      teal: "bg-card text-card-foreground shadow-card",
      roxo: "bg-card text-card-foreground shadow-card",
      azul: "bg-card text-card-foreground shadow-card",
    },
  },
  defaultVariants: { variant: "sage" },
});

const corChip: Record<string, string> = {
  hero: "rgba(255,255,255,0.22)",
  sage: "#8CB84A",
  coral: "#B23A2E",
  ambar: "#E3A62F",
  teal: "#0FA37E",
  roxo: "#B45FC7",
  azul: "#4C7DF0",
};

type IconType = React.ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill"; className?: string }>;

type StatCardProps = VariantProps<typeof cartaoVariantes> & {
  label: string;
  valor: string;
  detalhe?: string;
  delta?: number;
  serie?: number[];
  icon?: IconType;
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

export function StatCard({ label, valor, detalhe, variant, delta, serie, icon: Icon, href, children }: StatCardProps) {
  const v = variant ?? "sage";
  const deltaPositivo = typeof delta === "number" && delta >= 0;
  const corDelta = v === "hero" ? "text-white" : deltaPositivo ? "text-positivo" : "text-destructive";
  const corSpark = v === "hero" ? "#ffffff" : deltaPositivo ? "var(--positivo)" : "var(--destructive)";

  const conteudo = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                v === "hero" ? "text-white" : "text-white",
              )}
              style={{ background: corChip[v] }}
            >
              <Icon size={16} weight="bold" />
            </span>
          )}
          <span className={cn("text-[11px] font-bold uppercase tracking-wider", v === "hero" ? "text-white/80" : "text-muted-foreground")}>
            {label}
          </span>
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

      {detalhe && (
        <span className={cn("text-xs font-medium", v === "hero" ? "text-white/80" : "text-muted-foreground")}>
          {detalhe}
        </span>
      )}

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
          className={cn(
            // group-focus-visible além do hover — sem isso, quem navega
            // por teclado nunca vê a pista de "isto é clicável" que o
            // mouse recebe (achado na auditoria de acessibilidade).
            "absolute right-4 bottom-4 opacity-0 transition-opacity group-hover/stat:opacity-100 group-focus-visible/stat:opacity-100",
            v === "hero" ? "text-white/80" : "text-muted-foreground",
          )}
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn(cartaoVariantes({ variant }), "transition-shadow hover:shadow-lg")}>
        {conteudo}
      </Link>
    );
  }

  return <div className={cn(cartaoVariantes({ variant }))}>{conteudo}</div>;
}
