"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PessoaCombobox } from "./pessoa-combobox";

type Categoria = { id: string; nome: string };
type Pessoa = { id: string; nome: string };
type ResultadoAcao = { erro: string } | { sucesso: true };

const estadoInicial = { erro: "" };

const NUMEROS_PARCELA = Array.from({ length: 12 }, (_, i) => i + 1);

export function EventoFinanceiroForm({
  tipo,
  categorias,
  pessoas,
  acao,
}: {
  tipo: "RECEITA" | "DESPESA";
  categorias: Categoria[];
  pessoas: Pessoa[];
  acao: (formData: FormData) => Promise<ResultadoAcao>;
}) {
  const ehReceita = tipo === "RECEITA";
  // Select e PessoaCombobox guardam estado próprio (não são inputs nativos
  // controláveis por form.reset()) — trocar a key remonta tudo do zero após
  // um envio bem-sucedido, inclusive esses dois, sem precisar de reset
  // imperativo em cada componente filho.
  const [chaveFormulario, setChaveFormulario] = useState(0);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await acao(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    setChaveFormulario((k) => k + 1);
    return { erro: "" };
  }, estadoInicial);

  return (
    <form
      key={chaveFormulario}
      action={formAction}
      className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2"
    >
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Input
          id="descricao"
          name="descricao"
          type="text"
          required
          placeholder={ehReceita ? "Ex.: Honorários — Cliente Almeida" : "Ex.: Aluguel do escritório"}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="valor">Valor total (R$)</Label>
        <Input id="valor" name="valor" type="text" inputMode="decimal" required placeholder="0,00" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="data_vencimento">{NUMEROS_PARCELA.length > 1 ? "1º vencimento" : "Vencimento"}</Label>
        <Input id="data_vencimento" name="data_vencimento" type="date" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="categoria_id">Categoria</Label>
        <Select name="categoria_id" required>
          <SelectTrigger id="categoria_id" className="w-full">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="numero_parcelas">Parcelas</Label>
        <Select name="numero_parcelas" defaultValue="1">
          <SelectTrigger id="numero_parcelas" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NUMEROS_PARCELA.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n === 1 ? "À vista" : `${n}x`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label>{ehReceita ? "Cliente" : "Fornecedor"} (opcional)</Label>
        <PessoaCombobox pessoas={pessoas} perfil={ehReceita ? "CLIENTE" : "FORNECEDOR"} label={`Selecionar ${ehReceita ? "cliente" : "fornecedor"}...`} />
      </div>

      {estado.erro && <p className="text-sm text-destructive sm:col-span-2">{estado.erro}</p>}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : ehReceita ? "Registrar receita" : "Registrar despesa"}
        </Button>
      </div>
    </form>
  );
}
