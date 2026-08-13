"use client";

import { useActionState } from "react";
import Link from "next/link";
import { entrar } from "../actions";
import { AuthShell } from "@/components/layout/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const estadoInicial = { erro: "" };

export default function PaginaEntrar() {
  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await entrar(formData);
    // entrar() redireciona em caso de sucesso — só chega aqui se deu erro
    if (resultado && "erro" in resultado) return { erro: resultado.erro };
    return { erro: "" };
  }, estadoInicial);

  return (
    <AuthShell titulo="Entrar" subtitulo="Acesse sua conta.">
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" name="senha" type="password" required />
        </div>

        {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

        <Button type="submit" disabled={pendente} className="w-full">
          {pendente ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-foreground underline underline-offset-4">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  );
}
