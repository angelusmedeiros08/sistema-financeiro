"use client";

import { useActionState, useMemo, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PessoaCombobox } from "./pessoa-combobox";
import { CentroCustoCombobox } from "./centro-custo-combobox";
import { CategoriaCombobox } from "./categoria-combobox";
import { RateioCategorias } from "./rateio-categorias";
import { RecorrenciaCampos } from "./recorrencia-campos";
import { AnexoCampos } from "./anexo-campos";
import { parseNumeroBR } from "@/lib/formatacao";

type Categoria = { id: string; nome: string };
type Pessoa = { id: string; nome: string };
type CentroCusto = { id: string; nome: string };
type ResultadoAcao = { erro: string } | { sucesso: true };

const estadoInicial = { erro: "" };

const NUMEROS_PARCELA = Array.from({ length: 12 }, (_, i) => i + 1);

export function EventoFinanceiroForm({
  tipo,
  categorias,
  pessoas,
  centrosCusto,
  acao,
}: {
  tipo: "RECEITA" | "DESPESA";
  categorias: Categoria[];
  pessoas: Pessoa[];
  centrosCusto: CentroCusto[];
  acao: (formData: FormData) => Promise<ResultadoAcao>;
}) {
  const ehReceita = tipo === "RECEITA";
  // Select e PessoaCombobox guardam estado próprio (não são inputs nativos
  // controláveis por form.reset()) — trocar a key remonta tudo do zero após
  // um envio bem-sucedido, inclusive esses dois, sem precisar de reset
  // imperativo em cada componente filho.
  const [chaveFormulario, setChaveFormulario] = useState(0);
  const [valorTexto, setValorTexto] = useState("");
  const [rateioAtivo, setRateioAtivo] = useState(false);
  const [rateioValido, setRateioValido] = useState(false);
  // Muda só quando o formulário remonta (lançamento novo) — um duplo clique
  // ou reenvio de rede no MESMO envio manda a mesma chave duas vezes, e
  // criarEventoFinanceiro (via p_import_key) devolve o evento já criado em
  // vez de duplicar o lançamento contábil (achado em auditoria de
  // segurança: só a importação em lote tinha essa proteção, o formulário
  // manual não tinha nenhuma).
  const chaveIdempotencia = useMemo(() => crypto.randomUUID(), [chaveFormulario]);

  const valorNumerico = parseNumeroBR(valorTexto);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await acao(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    setChaveFormulario((k) => k + 1);
    setValorTexto("");
    setRateioAtivo(false);
    return { erro: "" };
  }, estadoInicial);

  return (
    <form
      key={chaveFormulario}
      action={formAction}
      className="grid gap-4 rounded-2xl bg-card shadow-card p-5 sm:grid-cols-2"
    >
      <input type="hidden" name="idempotency_key" value={chaveIdempotencia} />

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Input
          id="descricao"
          name="descricao"
          type="text"
          required
          placeholder={ehReceita ? "Ex.: Honorários de Cliente Almeida" : "Ex.: Aluguel do escritório"}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="valor">Valor total (R$)</Label>
        <Input
          id="valor"
          name="valor"
          type="text"
          inputMode="decimal"
          required
          placeholder="0,00"
          value={valorTexto}
          onChange={(e) => setValorTexto(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="data_vencimento">{NUMEROS_PARCELA.length > 1 ? "1º vencimento" : "Vencimento"}</Label>
        <Input id="data_vencimento" name="data_vencimento" type="date" required />
      </div>

      <div className="min-w-0 space-y-1.5 sm:col-span-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={rateioAtivo ? undefined : "categoria_id"}>Categoria</Label>
          <button
            type="button"
            onClick={() => setRateioAtivo((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {rateioAtivo ? "Usar categoria única" : "Dividir entre categorias"}
            <CaretDown size={12} className={rateioAtivo ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        </div>

        {rateioAtivo ? (
          <RateioCategorias
            categorias={categorias}
            centrosCusto={centrosCusto}
            valorTotal={valorNumerico}
            onValidacaoChange={setRateioValido}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <CategoriaCombobox categorias={categorias} />
            <CentroCustoCombobox centrosCusto={centrosCusto} />
          </div>
        )}
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

      <div className="space-y-1.5">
        <Label>{ehReceita ? "Cliente" : "Fornecedor"} (opcional)</Label>
        <PessoaCombobox pessoas={pessoas} perfil={ehReceita ? "CLIENTE" : "FORNECEDOR"} label={`Selecionar ${ehReceita ? "cliente" : "fornecedor"}...`} />
      </div>

      <RecorrenciaCampos />

      <div className="space-y-1.5 sm:col-span-2">
        <Label>Anexo (opcional)</Label>
        <AnexoCampos />
      </div>

      {estado.erro && <p className="text-sm text-destructive sm:col-span-2">{estado.erro}</p>}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pendente || (rateioAtivo && !rateioValido)}>
          {pendente ? "Salvando..." : ehReceita ? "Registrar receita" : "Registrar despesa"}
        </Button>
      </div>
    </form>
  );
}
