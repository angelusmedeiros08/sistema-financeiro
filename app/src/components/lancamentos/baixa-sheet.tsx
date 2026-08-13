"use client";

import { useActionState, useState } from "react";
import { CaretDown, HandCoins } from "@phosphor-icons/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatarMoeda } from "@/lib/formatacao";
import { darBaixa } from "@/lib/contabil/baixa-actions";

type ContaFinanceira = { id: string; nome: string };
const estadoInicial = { erro: "" };

export function BaixaSheet({
  parcelaId,
  descricao,
  saldoResidual,
  contasFinanceiras,
  rotuloAcao,
}: {
  parcelaId: string;
  descricao: string;
  saldoResidual: number;
  contasFinanceiras: ContaFinanceira[];
  rotuloAcao: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [mostrarComposicao, setMostrarComposicao] = useState(false);
  // mesmo raciocínio do EventoFinanceiroForm: o Select de conta financeira
  // guarda estado próprio, então remontar via key é o jeito confiável de
  // limpar o formulário para a próxima baixa.
  const [chaveFormulario, setChaveFormulario] = useState(0);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await darBaixa(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    setChaveFormulario((k) => k + 1);
    setAberto(false);
    setMostrarComposicao(false);
    return { erro: "" };
  }, estadoInicial);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <HandCoins size={14} />
          {rotuloAcao}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0">
        <SheetHeader>
          <SheetTitle>{rotuloAcao}</SheetTitle>
        </SheetHeader>

        <form key={chaveFormulario} action={formAction} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
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
              <Input id="data_pagamento" name="data_pagamento" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
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
            <Label htmlFor="metodo_pagamento">Método de pagamento</Label>
            <Input id="metodo_pagamento" name="metodo_pagamento" type="text" placeholder="Ex.: PIX, boleto, cartão" />
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

          {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={pendente} className="w-full">
              {pendente ? "Registrando..." : "Confirmar baixa"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
