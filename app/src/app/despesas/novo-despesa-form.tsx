"use client";

import { useActionState, useRef } from "react";
import { criarDespesa } from "./actions";

type Categoria = { id: string; nome: string };

const estadoInicial = { erro: "" };

export function NovaDespesaForm({ categorias }: { categorias: Categoria[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await criarDespesa(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    formRef.current?.reset();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="descricao" className="mb-1 block text-sm font-medium text-neutral-700">
          Descrição
        </label>
        <input
          id="descricao"
          name="descricao"
          type="text"
          required
          placeholder="Ex.: Aluguel do escritório"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="valor" className="mb-1 block text-sm font-medium text-neutral-700">
          Valor (R$)
        </label>
        <input
          id="valor"
          name="valor"
          type="text"
          inputMode="decimal"
          required
          placeholder="0,00"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="data_vencimento" className="mb-1 block text-sm font-medium text-neutral-700">
          Vencimento
        </label>
        <input
          id="data_vencimento"
          name="data_vencimento"
          type="date"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="categoria_id" className="mb-1 block text-sm font-medium text-neutral-700">
          Categoria
        </label>
        <select
          id="categoria_id"
          name="categoria_id"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        >
          <option value="">Selecione...</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {estado.erro && <p className="text-sm text-red-600 sm:col-span-2">{estado.erro}</p>}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pendente ? "Salvando..." : "Registrar despesa"}
        </button>
      </div>
    </form>
  );
}
