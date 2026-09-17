"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { assinar } from "@/lib/pagamentos/assinatura-actions";
import { TRIAL_DIAS, VALOR_PLANO_MENSAL } from "@/lib/pagamentos/plano";
import { formatarMoeda } from "@/lib/formatacao";
import { mascararCpfCnpj } from "@/lib/pagamentos/mascara-cpf-cnpj";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const estadoInicial = { erro: "" };

const CONFIANCA = [
  `${TRIAL_DIAS} dias grátis, cobrança só depois do trial`,
  "Todos os recursos inclusos, sem módulo trancado",
  "Cancele quando quiser, sem multa",
];

export default function PaginaAssinar() {
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await assinar(formData);
    // assinar() só retorna quando dá erro. O caminho de sucesso é um
    // redirect() (next/navigation), que não volta pra cá.
    return resultado ?? estadoInicial;
  }, estadoInicial);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center px-6 py-4">
          <Link href="/">
            <Logo className="h-12 w-auto" />
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl grid-cols-1 lg:grid-cols-2">
        <div className="border-b border-border px-6 py-14 lg:border-b-0 lg:border-r lg:px-14 lg:py-20">
          <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            Organize o financeiro da sua empresa a partir de hoje.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Lançamentos, relatórios e importação com IA, prontos pra usar em poucos minutos.
          </p>

          <ul className="mt-10 flex flex-col gap-4">
            {CONFIANCA.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-positivo-foreground" weight="bold" />
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
            <span className="font-heading text-lg font-bold text-foreground">{formatarMoeda(VALOR_PLANO_MENSAL)}</span> por mês
            após o período de teste.
          </p>
        </div>

        <div className="px-6 py-14 lg:px-14 lg:py-20">
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">Crie sua conta</h2>

          <form action={formAction} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome_empresa">Nome da empresa</Label>
              <Input id="nome_empresa" name="nome_empresa" type="text" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nome_responsavel">Seu nome</Label>
              <Input id="nome_responsavel" name="nome_responsavel" type="text" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cpf_cnpj">CPF ou CNPJ</Label>
              <Input
                id="cpf_cnpj"
                name="cpf_cnpj"
                type="text"
                required
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(mascararCpfCnpj(e.target.value))}
                maxLength={18}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox
                name="aceite_termos"
                checked={aceitouTermos}
                onCheckedChange={(v) => setAceitouTermos(v === true)}
                className="mt-0.5"
              />
              <span className="text-muted-foreground">
                Li e aceito os{" "}
                <Link href="/termos" target="_blank" className="font-medium text-foreground underline underline-offset-4">
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link href="/privacidade" target="_blank" className="font-medium text-foreground underline underline-offset-4">
                  Política de Privacidade
                </Link>
                .
              </span>
            </label>

            {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

            <Button type="submit" disabled={pendente || !aceitouTermos} size="lg" className="w-full">
              {pendente ? "Abrindo checkout..." : "Continuar para o pagamento"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Você será redirecionado para o Checkout seguro do Asaas. Não coletamos dado de cartão neste site.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/entrar" className="font-semibold text-foreground underline underline-offset-4">
              Entrar
            </Link>
          </p>
        </div>
      </div>
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
