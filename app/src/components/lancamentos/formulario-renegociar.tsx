"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatarMoeda } from "@/lib/formatacao";
import { renegociarParcelaAction } from "@/lib/contabil/ciclo-vida-parcela-actions";

const estadoInicial = { erro: "" };

// Página cheia, substitui o antigo RenegociarSheet.
export function FormularioRenegociar({
  parcelaId,
  descricao,
  valor,
  dataVencimentoAtual,
  caminhoVoltar,
}: {
  parcelaId: string;
  descricao: string;
  valor: number;
  dataVencimentoAtual: string;
  caminhoVoltar: string;
}) {
  const router = useRouter();

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await renegociarParcelaAction(formData);
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
        <span className="text-foreground">Renegociar vencimento</span>
      </div>

      <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
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

        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Confirmar renegociação"}
        </Button>
      </form>
    </div>
  );
}
