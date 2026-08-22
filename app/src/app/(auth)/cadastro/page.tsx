"use client";

import { useActionState } from "react";
import Link from "next/link";
import { cadastrar } from "../actions";
import { CADASTRO_PUBLICO_ATIVO } from "../config";
import { AuthShell } from "@/components/layout/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const estadoInicial = { erro: "" };

export default function PaginaCadastro() {
  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await cadastrar(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    return { erro: "", sucesso: resultado.mensagem };
  }, estadoInicial as { erro: string; sucesso?: string });

  return (
    <AuthShell titulo="Criar conta" subtitulo="Cadastre sua empresa para começar.">
      {!CADASTRO_PUBLICO_ATIVO ? (
        <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Cadastro fechado no momento — peça um convite a quem já usa o sistema.
        </p>
      ) : estado.sucesso ? (
        <p className="rounded-xl border border-positivo/25 bg-positivo/10 p-4 text-sm text-positivo-foreground">
          {estado.sucesso}
        </p>
      ) : (
        <form action={formAction} className="space-y-4">
          <Campo label="Nome da empresa" name="nome_empresa" type="text" required />
          <Campo label="Seu nome" name="nome_usuario" type="text" required />
          <Campo label="E-mail" name="email" type="email" required />
          <Campo label="Senha" name="senha" type="password" required minLength={8} />

          {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

          <Button type="submit" disabled={pendente} className="w-full">
            {pendente ? "Criando..." : "Criar conta"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-foreground underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}

function Campo(props: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.name}>{props.label}</Label>
      <Input
        id={props.name}
        name={props.name}
        type={props.type}
        required={props.required}
        minLength={props.minLength}
      />
    </div>
  );
}
