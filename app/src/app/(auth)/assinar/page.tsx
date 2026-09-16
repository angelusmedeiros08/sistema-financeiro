"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { assinar } from "@/lib/pagamentos/assinatura-actions";
import { TRIAL_DIAS, VALOR_PLANO_MENSAL } from "@/lib/pagamentos/plano";
import { formatarMoeda } from "@/lib/formatacao";
import { AuthShell } from "@/components/layout/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const estadoInicial = { erro: "" };

export default function PaginaAssinar() {
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await assinar(formData);
    // assinar() só retorna quando dá erro — o caminho de sucesso é um
    // redirect() (next/navigation), que não volta pra cá.
    return resultado ?? estadoInicial;
  }, estadoInicial);

  return (
    <AuthShell titulo="Assinar o Finanssi" subtitulo={`${TRIAL_DIAS} dias grátis no cartão de crédito. Cobrança só depois do trial.`}>
      <div className="mb-6 flex items-baseline justify-between rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Assinatura Finanssi</p>
          <p className="text-xs text-muted-foreground">Todos os recursos inclusos, sem módulo trancado.</p>
        </div>
        <p className="flex items-baseline gap-1">
          <span className="font-heading text-xl font-bold tabular-nums text-foreground">{formatarMoeda(VALOR_PLANO_MENSAL)}</span>
          <span className="text-xs text-muted-foreground">/mês</span>
        </p>
      </div>

      <form action={formAction} className="space-y-4">
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
          <Input id="cpf_cnpj" name="cpf_cnpj" type="text" required placeholder="Só números ou com pontuação" />
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

        <Button type="submit" disabled={pendente || !aceitouTermos} className="w-full">
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
    </AuthShell>
  );
}
