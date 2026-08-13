"use client";

import { useActionState } from "react";
import { definirSenhaConvite } from "../../actions";
import { AuthShell } from "@/components/layout/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const estadoInicial = { erro: "" };

export default function PaginaDefinirSenhaConvite() {
  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await definirSenhaConvite(formData);
    // definirSenhaConvite redireciona em caso de sucesso — só chega aqui se deu erro
    if (resultado && "erro" in resultado) return { erro: resultado.erro };
    return { erro: "" };
  }, estadoInicial);

  return (
    <AuthShell titulo="Bem-vindo" subtitulo="Confirme seu nome e escolha uma senha pra entrar.">
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Seu nome</Label>
          <Input id="nome" name="nome" type="text" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" name="senha" type="password" required minLength={8} />
        </div>

        {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

        <Button type="submit" disabled={pendente} className="w-full">
          {pendente ? "Salvando..." : "Entrar"}
        </Button>
      </form>
    </AuthShell>
  );
}
