import Link from "next/link";
import { redirect } from "next/navigation";
import { Coins, Users, Package, Sparkle, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { cn } from "@/lib/utils";

type CardImportacao = {
  titulo: string;
  descricao: string;
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill"; className?: string }>;
  href?: string;
};

const CARDS: CardImportacao[] = [
  { titulo: "Lançamentos financeiros", descricao: "Receitas e despesas via planilha.", icon: Coins, href: "/importacao/planilha" },
  { titulo: "Clientes/Fornecedores", descricao: "Cadastro de pessoas via planilha.", icon: Users, href: "/importacao/pessoas" },
  { titulo: "Produtos", descricao: "Em breve — o módulo de Produtos ainda não existe.", icon: Package },
  { titulo: "Importar com IA", descricao: "Em breve — cole um texto ou envie um print e deixe a IA extrair os dados.", icon: Sparkle },
];

export default async function PaginaImportacao() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Importação</h1>
        <p className="mt-1 text-sm text-muted-foreground">Escolha o que você quer importar.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const conteudo = (
            <div
              className={cn(
                "flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-colors",
                card.href ? "hover:border-primary/40 hover:bg-muted/30" : "opacity-60",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={18} weight="bold" />
                </span>
                {!card.href && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    em breve
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{card.titulo}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{card.descricao}</p>
              </div>
              {card.href && (
                <span className="mt-auto flex items-center gap-1 text-xs font-medium text-primary">
                  Importar
                  <ArrowRight size={12} />
                </span>
              )}
            </div>
          );

          return card.href ? (
            <Link key={card.titulo} href={card.href}>
              {conteudo}
            </Link>
          ) : (
            <div key={card.titulo}>{conteudo}</div>
          );
        })}
      </div>
    </div>
  );
}
