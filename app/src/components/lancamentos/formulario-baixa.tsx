"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatarMoeda } from "@/lib/formatacao";
import { darBaixa } from "@/lib/contabil/baixa-actions";
import { AnexoCampos } from "@/components/formularios/anexo-campos";
import { FormaPagamentoCombobox } from "@/components/formularios/forma-pagamento-combobox";

type ContaFinanceira = { id: string; nome: string };
type FormaPagamento = { id: string; nome: string };
const estadoInicial = { erro: "" };

// Página cheia, substitui o antigo BaixaSheet — mesmo formulário, sem
// painel lateral. "Anexos" fica como seção no rodapé, exatamente onde o
// Conta Azul coloca o comprovante de pagamento.
export function FormularioBaixa({
  parcelaId,
  descricao,
  saldoResidual,
  contasFinanceiras,
  formasPagamento,
  rotuloAcao,
  caminhoVoltar,
}: {
  parcelaId: string;
  descricao: string;
  saldoResidual: number;
  contasFinanceiras: ContaFinanceira[];
  formasPagamento: FormaPagamento[];
  rotuloAcao: string;
  caminhoVoltar: string;
}) {
  const [mostrarComposicao, setMostrarComposicao] = useState(false);
  const router = useRouter();

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await darBaixa(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    router.push(caminhoVoltar);
    router.refresh();
    return { erro: "" };
  }, estadoInicial);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={caminhoVoltar} className="hover:text-foreground">
          Voltar
        </Link>
        <span>/</span>
        <span className="text-foreground">{rotuloAcao}</span>
      </div>

      <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <input type="hidden" name="parcela_id" value={parcelaId} />

        <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <p className="font-medium text-foreground">{descricao}</p>
          <p className="text-muted-foreground">Saldo em aberto: {formatarMoeda(saldoResidual)}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="conta_financeira_id">Conta financeira</Label>
          <Select name="conta_financeira_id" required>
            <SelectTrigger id="conta_financeira_id" className="w-full">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {contasFinanceiras.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="data_pagamento">Data</Label>
            <Input
              id="data_pagamento"
              name="data_pagamento"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="valor_pago">Valor pago</Label>
            <Input
              id="valor_pago"
              name="valor_pago"
              type="text"
              inputMode="decimal"
              required
              defaultValue={saldoResidual.toFixed(2).replace(".", ",")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Forma de pagamento</Label>
          <FormaPagamentoCombobox formasPagamento={formasPagamento} />
        </div>

        <button
          type="button"
          onClick={() => setMostrarComposicao((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <CaretDown size={14} className={mostrarComposicao ? "rotate-180 transition-transform" : "transition-transform"} />
          Juros, multa, desconto ou taxa
        </button>

        {mostrarComposicao && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border p-3">
            <div className="space-y-1.5">
              <Label htmlFor="valor_juros">Juros</Label>
              <Input id="valor_juros" name="valor_juros" type="text" inputMode="decimal" placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor_multa">Multa</Label>
              <Input id="valor_multa" name="valor_multa" type="text" inputMode="decimal" placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor_desconto">Desconto</Label>
              <Input id="valor_desconto" name="valor_desconto" type="text" inputMode="decimal" placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor_taxa">Taxa</Label>
              <Input id="valor_taxa" name="valor_taxa" type="text" inputMode="decimal" placeholder="0,00" />
            </div>
          </div>
        )}

        <div className="space-y-1.5 border-t border-border pt-4">
          <Label>Anexos (opcional)</Label>
          <p className="text-xs text-muted-foreground">Comprovante de pagamento: PIX, recibo, etc.</p>
          <AnexoCampos />
        </div>

        {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

        <Button type="submit" disabled={pendente}>
          {pendente ? "Registrando..." : "Confirmar baixa"}
        </Button>
      </form>
    </div>
  );
}
