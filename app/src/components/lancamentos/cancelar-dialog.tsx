"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cancelarParcelaAction } from "@/lib/contabil/ciclo-vida-parcela-actions";

const estadoInicial = { erro: "" };

export function CancelarDialog({
  aberto,
  onAbertoChange,
  parcelaId,
  descricao,
}: {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  parcelaId: string;
  descricao: string;
}) {
  const [chaveFormulario, setChaveFormulario] = useState(0);
  const router = useRouter();

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await cancelarParcelaAction(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    setChaveFormulario((k) => k + 1);
    onAbertoChange(false);
    router.refresh();
    return { erro: "" };
  }, estadoInicial);

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar parcela</DialogTitle>
        </DialogHeader>

        <form key={chaveFormulario} action={formAction} className="space-y-3">
          <input type="hidden" name="parcela_id" value={parcelaId} />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{descricao}</span> — a parcela deixa de aparecer nas
            contas em aberto. Essa ação não pode ser desfeita diretamente.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea id="motivo" name="motivo" required placeholder="Ex.: lançamento duplicado por engano" />
          </div>

          {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onAbertoChange(false)}>
              Voltar
            </Button>
            <Button type="submit" variant="destructive" disabled={pendente}>
              {pendente ? "Cancelando..." : "Cancelar parcela"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
