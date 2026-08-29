"use client";

import { useActionState } from "react";
import { redefinirSenha } from "../actions";
import { AuthShell } from "@/components/layout/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const estadoInicial = { erro: "" };

export default function PaginaRedefinirSenha() {
  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await redefinirSenha(formData);
    // redefinirSenha redireciona em caso de sucesso — só chega aqui se deu erro
    if (resultado && "erro" in resultado) return { erro: resultado.erro };
    return { erro: "" };
  }, estadoInicial);

  return (
    <AuthShell titulo="Nova senha" subtitulo="Escolha uma senha nova pra sua conta.">
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="senha">Nova senha</Label>
          <Input id="senha" name="senha" type="password" required minLength={8} />
        </div>

        {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

        <Button type="submit" disabled={pendente} className="w-full">
          {pendente ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </AuthShell>
  );
}
