import Link from "next/link";
import { ArrowRight, Check, HandCoins, Receipt, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { TRIAL_DIAS } from "@/lib/pagamentos/plano";
import { PainelPreview } from "./painel-preview";
import { VisualChatIA, VisualImportacaoIA, VisualRelatorios } from "./feature-visuals";

const DESTAQUES = [
  {
    Visual: VisualImportacaoIA,
    titulo: "A IA lê o documento, você só confirma",
    descricao:
      "Cole um extrato ou envie a foto de um recibo. A IA extrai data, valor e categoria e propõe o lançamento certo. Nada vira registro real sem você aprovar.",
  },
  {
    Visual: VisualRelatorios,
    titulo: "Relatório que fecha sozinho",
    descricao:
      "DRE, DFC e indicadores calculados direto do que já foi lançado. Sem planilha auxiliar, sem exportação manual todo fim de mês.",
  },
  {
    Visual: VisualChatIA,
    titulo: "Pergunte, em vez de procurar",
    descricao:
      "Quanto entrou em março, qual categoria mais cresceu, quanto falta pra bater a meta. O Chat IA responde com o número de verdade por trás.",
  },
];

const RECURSOS_ADICIONAIS = [
  { icone: Receipt, texto: "Contas a pagar e a receber, com parcelamento e baixa parcial" },
  { icone: HandCoins, texto: "Portal para o seu cliente acompanhar as próprias cobranças" },
  { icone: UsersThree, texto: "Equipe com papéis reais, sem dividir senha de admin" },
];

const INCLUSOS = ["Lançamento ilimitado", "Todos os relatórios", "Importação com IA", "Chat IA", "Cancele quando quiser"];

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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
        <Link href="/">
          <Logo className="h-20 w-auto" />
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/entrar" className="rounded-control px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Entrar
          </Link>
          <Button asChild size="sm">
            <Link href="/planos">Assinar</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative bg-background pt-20 pb-28 sm:pt-28 sm:pb-36">
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-14 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <h1 className="font-heading text-5xl font-extrabold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-[4rem]">
            Todo o <span className="text-primary">financeiro</span> da sua empresa, de olho no <span className="text-primary">lucro real</span>.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Lançamentos, contas a pagar e a receber, DRE e fluxo de caixa que fecham sozinhos. Uma IA lê extrato e
            recibo por você, e nunca lança nada sem a sua confirmação.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/planos"
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

      <DivisoriaOnda className="text-card" />
    </section>
  );
}

function DivisoriaOnda({ className }: { className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 60"
      preserveAspectRatio="none"
      className={`absolute inset-x-0 bottom-0 h-[50px] w-full ${className}`}
    >
      <path d="M0,32 C240,60 480,4 720,20 C960,36 1200,58 1440,24 L1440,60 L0,60 Z" fill="currentColor" />
    </svg>
  );
}

function FaixaConfianca() {
  return (
    <section className="bg-card py-8">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-base font-medium text-foreground">
          Feito pra escritórios e empresas que trocaram a planilha por um sistema e não querem voltar.
        </p>
      </div>
    </section>
  );
}

function Funcionalidades() {
  return (
    <section className="bg-card py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-xl">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tudo que o financeiro da sua empresa precisa, em um só sistema.
          </h2>
        </div>

        <div className="mt-16 flex flex-col gap-20">
          {DESTAQUES.map(({ Visual, titulo, descricao }, i) => (
            <div key={titulo} className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground">{titulo}</h3>
                <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">{descricao}</p>
              </div>
              <div className={`flex justify-center ${i % 2 === 1 ? "lg:order-1 lg:justify-start" : "lg:justify-end"}`}>
                <Visual />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 grid grid-cols-1 gap-6 border-t border-border pt-12 sm:grid-cols-3">
          {RECURSOS_ADICIONAIS.map(({ icone: Icone, texto }) => (
            <div key={texto} className="flex items-start gap-3">
              <Icone className="mt-0.5 size-5 shrink-0 text-primary" weight="bold" />
              <p className="text-sm leading-relaxed text-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChamadaFinal() {
  return (
    <section className="bg-primary py-20">
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1fr_auto]">
        <div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            Sua próxima virada de mês pode ser diferente.
          </h2>
          <p className="mt-3 text-primary-foreground/80">{TRIAL_DIAS} dias grátis. Cobrança só depois do trial.</p>
          <Link
            href="/planos"
            className="mt-7 inline-flex items-center gap-2 rounded-control bg-background px-6 py-3.5 text-sm font-semibold text-foreground transition-opacity hover:opacity-90"
          >
            Testar o Finanssi
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="w-full max-w-xs rounded-2xl bg-background p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.3)] lg:justify-self-end">
          <p className="text-sm font-semibold text-foreground">Incluso desde o primeiro dia</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {INCLUSOS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-4 shrink-0 text-positivo-foreground" weight="bold" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Rodape() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
        <Logo className="h-14 w-auto" />
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
