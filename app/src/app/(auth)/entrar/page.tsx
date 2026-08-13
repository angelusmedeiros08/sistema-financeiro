"use client";

import { useActionState } from "react";
import Link from "next/link";
import { entrar } from "../actions";

const estadoInicial = { erro: "" };

export default function PaginaEntrar() {
  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await entrar(formData);
    // entrar() redireciona em caso de sucesso — só chega aqui se deu erro
    if (resultado && "erro" in resultado) return { erro: resultado.erro };
    return { erro: "" };
  }, estadoInicial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">Entrar</h1>
        <p className="mb-6 text-sm text-neutral-500">Acesse sua conta.</p>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="senha" className="mb-1 block text-sm font-medium text-neutral-700">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>

          {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

          <button
            type="submit"
            disabled={pendente}
            className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pendente ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-neutral-900 underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
