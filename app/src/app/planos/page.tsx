import type { Metadata } from "next";
import { Check, X } from "@phosphor-icons/react/dist/ssr";

// Rascunho de apresentação dos 3 planos (estrutura fixada em 16/09/2026,
// valores ainda não definidos com os sócios — ver memória do projeto).
// Nunca indexar: preço de exemplo não pode aparecer pra ninguém como se
// fosse real. Botões não navegam pra lugar nenhum de propósito — ainda não
// existe checkout por tier, só o único plano hoje em /assinar.
export const metadata: Metadata = {
  title: "Planos — Finanssi (rascunho)",
  robots: { index: false, follow: false },
};

type Plano = {
  nome: string;
  publico: string;
  valor: number;
  comIA: boolean;
  destaque?: boolean;
  vagas: string;
};

const PLANOS: Plano[] = [
  { nome: "Essencial", publico: "Sem IA, até 2 pessoas na equipe", valor: 97, comIA: false, vagas: "Até 2 pessoas na equipe" },
  { nome: "Profissional", publico: "Com IA, até 5 pessoas na equipe", valor: 197, comIA: true, destaque: true, vagas: "Até 5 pessoas na equipe" },
  { nome: "Escritório", publico: "Com IA, até 10 pessoas na equipe", valor: 347, comIA: true, vagas: "Até 10 pessoas na equipe" },
];

function Logo({ className }: { className?: string }) {
  return (
    <>
      <img src="/logo/completo-claro.png" alt="Finanssi" className={`${className} dark:hidden`} />
      <img src="/logo/completo-escuro.png" alt="Finanssi" className={`hidden ${className} dark:block`} />
    </>
  );
}

export default function PaginaPlanos() {
  return (
    <div className="min-h-screen bg-[color-mix(in_oklch,var(--background),var(--primary)_7%)] px-4 py-14 sm:py-20">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
        <Logo className="h-32 w-auto sm:h-40" />
        <p className="mt-5 text-sm font-medium text-muted-foreground">Assinatura Finanssi</p>

        <span className="mt-6 rounded-full bg-accent-gold px-4 py-1.5 text-xs font-semibold text-[#2a1c05]">
          Rascunho — nomes e preços de exemplo, ainda não definidos
        </span>

        <div className="mt-10 max-w-xl text-center">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">Escolha o plano da sua equipe</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Todos os planos incluem lançamentos, contas a pagar/receber e relatórios completos. Nos planos com IA, a cota mensal
            é compartilhada por toda a equipe, não por pessoa.
          </p>
        </div>

        <div className="mt-12 grid w-full grid-cols-1 items-start gap-6 md:grid-cols-3">
          {PLANOS.map((plano) => (
            <div
              key={plano.nome}
              className={`relative flex flex-col rounded-[20px] border bg-card p-8 shadow-[0_20px_50px_-30px_rgba(26,29,31,0.35)] ${
                plano.destaque ? "border-2 border-primary shadow-[0_24px_60px_-28px_rgba(216,88,58,0.4)] md:-translate-y-1.5" : "border-border"
              }`}
            >
              {plano.destaque && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                  Mais escolhido
                </span>
              )}

              <h3 className="font-heading text-lg font-extrabold tracking-tight text-foreground">{plano.nome}</h3>
              <p className="mt-1 min-h-[34px] text-sm text-muted-foreground">{plano.publico}</p>

              <p className="mt-4 flex items-baseline gap-1">
                <span className="font-heading text-3xl font-extrabold tabular-nums tracking-tight text-foreground">R$ {plano.valor}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </p>

              <ul className="mt-5 flex flex-1 flex-col gap-3 border-t border-border pt-5">
                <li className="flex items-start gap-2.5 text-sm text-foreground">
                  <CheckBadge />
                  Lançamentos e relatórios completos
                </li>
                <li className="flex items-start gap-2.5 text-sm font-semibold text-foreground">
                  <CheckBadge />
                  {plano.vagas}
                </li>
                {plano.comIA ? (
                  <li className="flex items-start gap-2.5 text-sm text-foreground">
                    <CheckBadge />
                    <span>
                      Chat IA e Importação com IA
                      <span className="block text-xs font-normal text-muted-foreground">Cota de IA compartilhada entre toda a equipe</span>
                    </span>
                  </li>
                ) : (
                  <li className="flex items-start gap-2.5 text-sm text-muted-foreground/60">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-muted">
                      <X className="size-2.5 text-muted-foreground" weight="bold" />
                    </span>
                    Chat IA e Importação com IA
                  </li>
                )}
              </ul>

              <button
                type="button"
                disabled
                className={`mt-6 h-11 w-full rounded-[10px] text-sm font-bold ${
                  plano.destaque
                    ? "bg-primary text-primary-foreground shadow-[0_10px_24px_-10px_rgba(216,88,58,0.6)]"
                    : "border border-border bg-transparent text-foreground"
                }`}
              >
                Começar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheckBadge() {
  return (
    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-positivo">
      <Check className="size-2.5 text-white" weight="bold" />
    </span>
  );
}
