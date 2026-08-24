"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { assinar } from "@/lib/pagamentos/assinatura-actions";
import { AuthShell } from "@/components/layout/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const estadoInicial = { erro: "" };

export default function PaginaAssinar() {
  const [formaPagamento, setFormaPagamento] = useState<"CREDIT_CARD" | "PIX">("CREDIT_CARD");
  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await assinar(formData);
    // assinar() só retorna quando dá erro — o caminho de sucesso é um
    // redirect() (next/navigation), que não volta pra cá.
    return resultado ?? estadoInicial;
  }, estadoInicial);

  return (
    <AuthShell titulo="Assinar o Núcleo" subtitulo="7 dias grátis no cartão. Sem cartão salvo, sem cobrança surpresa.">
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

        <div className="space-y-1.5">
          <Label>Forma de pagamento</Label>
          <RadioGroup
            name="forma_pagamento"
            value={formaPagamento}
            onValueChange={(v) => setFormaPagamento(v as "CREDIT_CARD" | "PIX")}
            className="gap-2"
          >
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border p-3 text-sm has-[[data-checked]]:border-primary">
              <RadioGroupItem value="CREDIT_CARD" id="forma_cartao" className="mt-0.5" />
              <span>
                <span className="block font-medium text-foreground">Cartão de crédito</span>
                <span className="block text-muted-foreground">7 dias grátis, primeira cobrança só depois do trial.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border p-3 text-sm has-[[data-checked]]:border-primary">
              <RadioGroupItem value="PIX" id="forma_pix" className="mt-0.5" />
              <span>
                <span className="block font-medium text-foreground">Pix</span>
                <span className="block text-muted-foreground">Sem trial — a primeira mensalidade é cobrada na hora.</span>
              </span>
            </label>
          </RadioGroup>
        </div>

        {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

        <Button type="submit" disabled={pendente} className="w-full">
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
