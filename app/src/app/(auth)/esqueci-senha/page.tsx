"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { solicitarRecuperacaoSenha } from "../actions";
import { AuthShell } from "@/components/layout/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const estadoInicial = { enviado: false };

export default function PaginaEsqueciSenha() {
  const [mensagem, setMensagem] = useState("");
  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await solicitarRecuperacaoSenha(formData);
    setMensagem(resultado.mensagem);
    return { enviado: true };
  }, estadoInicial);

  if (estado.enviado) {
    return (
      <AuthShell titulo="Verifique seu e-mail" subtitulo="Enviamos as instruções.">
        <p className="text-sm text-muted-foreground">{mensagem}</p>
        <Link href="/entrar" className="mt-6 block text-center text-sm font-semibold text-foreground underline underline-offset-4">
          Voltar pro login
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell titulo="Esqueci minha senha" subtitulo="Informe seu e-mail e mandamos um link pra redefinir.">
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required />
        </div>

        <Button type="submit" disabled={pendente} className="w-full">
          {pendente ? "Enviando..." : "Enviar link de recuperação"}
        </Button>
      </form>

      <Link href="/entrar" className="mt-6 block text-center text-sm text-muted-foreground underline underline-offset-4">
        Voltar pro login
      </Link>
    </AuthShell>
  );
}
