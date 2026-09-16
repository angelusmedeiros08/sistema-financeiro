import Link from "next/link";
import { ArrowRight, ChartLineUp, ChatCircleDots, FileMagnifyingGlass, HandCoins, Receipt, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { formatarMoeda } from "@/lib/formatacao";
import { TRIAL_DIAS, VALOR_PLANO_MENSAL } from "@/lib/pagamentos/plano";
import { PainelPreview } from "./painel-preview";

const FUNCIONALIDADES = [
  {
    icone: Receipt,
    titulo: "Lançamentos, contas a pagar e a receber",
    descricao: "Parcelamento, baixa parcial, renegociação e recorrência — o ciclo financeiro completo, não uma planilha com fórmula quebrando.",
  },
  {
    icone: ChartLineUp,
    titulo: "DRE, DFC e indicadores em tempo real",
    descricao: "Relatório que fecha sozinho a partir do que já foi lançado, não uma exportação que alguém monta manualmente todo fim de mês.",
  },
  {
    icone: FileMagnifyingGlass,
    titulo: "Importação com IA",
    descricao: "Extrato bancário, recibo, nota fiscal — a IA lê o documento e propõe o lançamento certo. Você confirma, ela nunca lança sozinha.",
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
    descricao: "Convide quem cuida do financeiro, defina o que cada um pode ver e fazer — sem dividir a mesma senha de admin.",
  },
];

export function PaginaLanding() {
  return (
    <div className="min-h-screen bg-background">
      <Cabecalho />
      <Hero />
      <FaixaConfianca />
      <Funcionalidades />
      <Precificacao />
      <ChamadaFinal />
      <Rodape />
    </div>
  );
}

function Cabecalho() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-heading text-lg font-bold tracking-tight text-white">Finanssi</span>
        <nav className="flex items-center gap-2">
          <Link href="/entrar" className="rounded-control px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white">
            Entrar
          </Link>
          <Link
            href="/assinar"
            className="rounded-control bg-white px-3.5 py-1.5 text-sm font-semibold text-[#14181A] transition-opacity hover:opacity-90"
          >
            Assinar
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#14181A] to-[#0F2620] pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 size-[32rem] rounded-full bg-gradient-to-br from-[#D8583A] to-[#A87C1F] opacity-20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/3 size-96 rounded-full bg-[#0FA37E] opacity-[0.08] blur-3xl"
      />

      <div className="relative mx-auto grid grid-cols-1 max-w-6xl gap-14 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70">
            ERP financeiro multi-empresa
          </p>
          <h1 className="font-heading text-5xl font-extrabold leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-[4.25rem]">
            O financeiro da sua empresa, finalmente em um lugar só.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/65">
            Lançamentos, contas a pagar e a receber, DRE e fluxo de caixa que fecham sozinhos — e uma IA que lê
            extrato e recibo por você, sem nunca lançar nada sem a sua confirmação.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/assinar"
              className="group inline-flex items-center gap-2 rounded-control bg-[#E2694B] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Testar {TRIAL_DIAS} dias grátis
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="text-sm text-white/45">Sem cartão salvo antes de decidir.</p>
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
          Feito pra escritórios e empresas que trocaram a planilha por um sistema — e não querem voltar.
        </p>
      </div>
    </section>
  );
}

function Funcionalidades() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">O que já está pronto</p>
        <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Não é um MVP com 3 telas. É o financeiro inteiro.
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

function Precificacao() {
  return (
    <section className="border-t border-border bg-card/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Preço</p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Um plano só. Sem módulo trancado atrás de upgrade.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Lançamento ilimitado, todos os relatórios, importação com IA e chat IA inclusos desde o primeiro dia.
              Cancele quando quiser, sem multa.
            </p>
          </div>

          <div className="w-full max-w-sm justify-self-start rounded-2xl border border-border bg-background p-7 shadow-card lg:justify-self-end">
            <p className="text-sm text-muted-foreground">Assinatura Finanssi</p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="font-heading text-4xl font-bold tabular-nums text-foreground">{formatarMoeda(VALOR_PLANO_MENSAL)}</span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{TRIAL_DIAS} dias grátis no cartão de crédito.</p>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link href="/assinar">Começar agora</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChamadaFinal() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#14181A] to-[#0F2620] py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/2 size-96 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#D8583A] to-[#A87C1F] opacity-20 blur-3xl"
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Sua próxima virada de mês pode ser diferente.
        </h2>
        <p className="mt-4 text-white/65">{TRIAL_DIAS} dias grátis, sem cartão salvo antes de decidir.</p>
        <Link
          href="/assinar"
          className="mt-8 inline-flex items-center gap-2 rounded-control bg-[#E2694B] px-6 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
        <span className="font-heading font-semibold text-foreground">Finanssi</span>
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
