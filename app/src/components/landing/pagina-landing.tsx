import Link from "next/link";
import { ArrowRight, ChartLineUp, ChatCircleDots, FileMagnifyingGlass, HandCoins, Receipt, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { TRIAL_DIAS } from "@/lib/pagamentos/plano";
import { PainelPreview } from "./painel-preview";

const FUNCIONALIDADES = [
  {
    icone: Receipt,
    titulo: "Lançamentos, contas a pagar e a receber",
    descricao: "Parcelamento, baixa parcial, renegociação e recorrência. É o ciclo financeiro completo, não uma planilha com fórmula quebrando.",
  },
  {
    icone: ChartLineUp,
    titulo: "DRE, DFC e indicadores em tempo real",
    descricao: "Relatório que fecha sozinho a partir do que já foi lançado, não uma exportação que alguém monta manualmente todo fim de mês.",
  },
  {
    icone: FileMagnifyingGlass,
    titulo: "Importação com IA",
    descricao: "Extrato bancário, recibo e nota fiscal: a IA lê o documento e propõe o lançamento certo. Você confirma, ela nunca lança sozinha.",
  },
  {
    icone: ChatCircleDots,
    titulo: "Chat IA sobre as suas finanças",
    descricao: "Pergunte quanto entrou em março, ou qual categoria mais cresceu no trimestre, e receba a resposta com o número de verdade por trás.",
  },
  {
    icone: HandCoins,
    titulo: "Portal do cliente",
    descricao: "Seu cliente acompanha as próprias cobranças e recebimentos sem precisar te ligar pra saber se o boleto já caiu.",
  },
  {
    icone: UsersThree,
    titulo: "Equipe com papéis reais",
    descricao: "Convide quem cuida do financeiro e defina o que cada um pode ver e fazer. Ninguém precisa dividir a senha de admin.",
  },
];

export function PaginaLanding() {
  return (
    <div className="min-h-screen bg-background">
      <Cabecalho />
      <Hero />
      <FaixaConfianca />
      <Funcionalidades />
      <ChamadaFinal />
      <Rodape />
    </div>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <>
      <img src="/logo/completo-claro.png" alt="Finanssi" className={`${className} dark:hidden`} />
      <img src="/logo/completo-escuro.png" alt="Finanssi" className={`hidden ${className} dark:block`} />
    </>
  );
}

function Cabecalho() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/">
          <Logo className="h-11 w-auto" />
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/entrar" className="rounded-control px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Entrar
          </Link>
          <Button asChild size="sm">
            <Link href="/assinar">Assinar</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b border-border py-20 sm:py-28">
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-14 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <h1 className="font-heading text-5xl font-extrabold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-[4rem]">
            O <span className="text-primary">financeiro</span> da sua empresa, finalmente em um lugar só.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Lançamentos, contas a pagar e a receber, DRE e fluxo de caixa que fecham sozinhos. Uma IA lê extrato e
            recibo por você, e nunca lança nada sem a sua confirmação.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/assinar"
              className="group inline-flex items-center gap-2 rounded-control bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Testar {TRIAL_DIAS} dias grátis
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="text-sm text-muted-foreground">Cartão salvo agora, cobrança só depois do trial.</p>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <PainelPreview />
        </div>
      </div>
    </section>
  );
}

function FaixaConfianca() {
  return (
    <section className="border-b border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-6 py-5">
        <p className="text-center text-sm text-muted-foreground">
          Feito pra escritórios e empresas que trocaram a planilha por um sistema e não querem voltar.
        </p>
      </div>
    </section>
  );
}

function Funcionalidades() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="max-w-xl">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Não é um MVP com três telas. É o financeiro inteiro.
        </h2>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {FUNCIONALIDADES.map(({ icone: Icone, titulo, descricao }) => (
          <div key={titulo} className="flex flex-col gap-3 bg-background p-7">
            <Icone className="size-6 text-primary" weight="duotone" />
            <h3 className="font-heading text-base font-bold tracking-tight text-foreground">{titulo}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{descricao}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChamadaFinal() {
  return (
    <section className="bg-primary py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
          Sua próxima virada de mês pode ser diferente.
        </h2>
        <p className="mt-4 text-primary-foreground/80">{TRIAL_DIAS} dias grátis. Cobrança só depois do trial.</p>
        <Link
          href="/assinar"
          className="mt-8 inline-flex items-center gap-2 rounded-control bg-background px-6 py-3.5 text-sm font-semibold text-foreground transition-opacity hover:opacity-90"
        >
          Testar o Finanssi
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

function Rodape() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
        <Logo className="h-9 w-auto" />
        <div className="flex items-center gap-6">
          <Link href="/termos" className="hover:text-foreground">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="hover:text-foreground">
            Política de Privacidade
          </Link>
          <Link href="/entrar" className="hover:text-foreground">
            Entrar
          </Link>
        </div>
      </div>
    </footer>
  );
}
