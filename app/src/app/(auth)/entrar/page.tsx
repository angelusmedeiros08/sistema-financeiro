"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { entrar } from "../actions";
import { CADASTRO_PUBLICO_ATIVO } from "../config";
import { AuthShell } from "@/components/layout/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const estadoInicial = { erro: "" };

// Mensagens pros códigos que /auth/confirm anexa via redirect quando a troca
// de token falha (link de convite/confirmação já usado, expirado, ou
// inválido) — sem isso o usuário só via a tela de login vazia, sem entender
// por que o link não funcionou.
const MENSAGENS_ERRO_LINK: Record<string, string> = {
  link_invalido: "Esse link expirou ou já foi usado — peça um novo convite a quem te convidou.",
};

function ErroDoLink() {
  const searchParams = useSearchParams();
  const erroLink = searchParams.get("erro");
  if (!erroLink) return null;

  const mensagem = MENSAGENS_ERRO_LINK[erroLink] ?? "Não foi possível processar o link. Tente novamente.";
  return (
    <p className="mb-4 rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
      {mensagem}
    </p>
  );
}

export default function PaginaEntrar() {
  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await entrar(formData);
    // entrar() redireciona em caso de sucesso — só chega aqui se deu erro
    if (resultado && "erro" in resultado) return { erro: resultado.erro };
    return { erro: "" };
  }, estadoInicial);

  return (
    <AuthShell titulo="Entrar" subtitulo="Acesse sua conta.">
      <Suspense fallback={null}>
        <ErroDoLink />
      </Suspense>
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

      {CADASTRO_PUBLICO_ATIVO && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-foreground underline underline-offset-4">
            Criar conta
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
