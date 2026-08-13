"use client";

import { useActionState, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatarMoeda } from "@/lib/formatacao";
import { renegociarParcelaAction } from "@/lib/contabil/ciclo-vida-parcela-actions";

const estadoInicial = { erro: "" };

export function RenegociarSheet({
  aberto,
  onAbertoChange,
  parcelaId,
  descricao,
  valor,
  dataVencimentoAtual,
}: {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  parcelaId: string;
  descricao: string;
  valor: number;
  dataVencimentoAtual: string;
}) {
  const [chaveFormulario, setChaveFormulario] = useState(0);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await renegociarParcelaAction(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    setChaveFormulario((k) => k + 1);
    onAbertoChange(false);
    return { erro: "" };
  }, estadoInicial);

  return (
    <Sheet open={aberto} onOpenChange={onAbertoChange}>
      <SheetContent className="flex flex-col gap-0">
        <SheetHeader>
          <SheetTitle>Renegociar vencimento</SheetTitle>
        </SheetHeader>

        <form key={chaveFormulario} action={formAction} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
          <input type="hidden" name="parcela_id" value={parcelaId} />

          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium text-foreground">{descricao}</p>
            <p className="text-muted-foreground">
              {formatarMoeda(valor)} · vencimento atual{" "}
              {new Date(dataVencimentoAtual + "T00:00:00").toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nova_data_vencimento">Nova data de vencimento</Label>
            <Input id="nova_data_vencimento" name="nova_data_vencimento" type="date" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea id="motivo" name="motivo" required placeholder="Ex.: cliente pediu mais prazo" />
          </div>

          {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={pendente} className="w-full">
              {pendente ? "Salvando..." : "Confirmar renegociação"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
