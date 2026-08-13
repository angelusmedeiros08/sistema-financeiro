"use client";

import { useActionState } from "react";
import Link from "next/link";
import { cadastrar } from "../actions";

const estadoInicial = { erro: "" };

export default function PaginaCadastro() {
  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await cadastrar(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    return { erro: "", sucesso: resultado.mensagem };
  }, estadoInicial as { erro: string; sucesso?: string });

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">Criar conta</h1>
        <p className="mb-6 text-sm text-neutral-500">Cadastre sua empresa para começar.</p>

        {estado.sucesso ? (
          <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">{estado.sucesso}</p>
        ) : (
          <form action={formAction} className="space-y-4">
            <Campo label="Nome da empresa" name="nome_empresa" type="text" required />
            <Campo label="Seu nome" name="nome_usuario" type="text" required />
            <Campo label="E-mail" name="email" type="email" required />
            <Campo label="Senha" name="senha" type="password" required minLength={8} />

            {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

            <button
              type="submit"
              disabled={pendente}
              className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {pendente ? "Criando..." : "Criar conta"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-neutral-500">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-medium text-neutral-900 underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
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
    <div>
      <label htmlFor={props.name} className="mb-1 block text-sm font-medium text-neutral-700">
        {props.label}
      </label>
      <input
        id={props.name}
        name={props.name}
        type={props.type}
        required={props.required}
        minLength={props.minLength}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
      />
    </div>
  );
}
