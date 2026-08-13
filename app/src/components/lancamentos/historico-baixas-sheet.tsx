"use client";

import { useTransition } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda } from "@/lib/formatacao";
import { estornarBaixaAction } from "@/lib/contabil/ciclo-vida-parcela-actions";

export type BaixaHistorico = {
  id: string;
  data_pagamento: string;
  valor_pago: number;
  valor_juros: number;
  valor_multa: number;
  valor_desconto: number;
  valor_taxa: number;
  estornado_em: string | null;
};

function LinhaBaixa({ baixa }: { baixa: BaixaHistorico }) {
  const [pendente, iniciarTransicao] = useTransition();
  const composicao = [
    baixa.valor_juros > 0 && `juros ${formatarMoeda(baixa.valor_juros)}`,
    baixa.valor_multa > 0 && `multa ${formatarMoeda(baixa.valor_multa)}`,
    baixa.valor_desconto > 0 && `desconto ${formatarMoeda(baixa.valor_desconto)}`,
    baixa.valor_taxa > 0 && `taxa ${formatarMoeda(baixa.valor_taxa)}`,
  ].filter(Boolean);

  async function acionarEstorno() {
    const formData = new FormData();
    formData.set("baixa_id", baixa.id);
    await estornarBaixaAction(formData);
  }

  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-none">
      <div>
        <p className="font-medium text-foreground">{formatarMoeda(baixa.valor_pago)}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(baixa.data_pagamento + "T00:00:00").toLocaleDateString("pt-BR")}
          {composicao.length > 0 && ` · ${composicao.join(", ")}`}
        </p>
      </div>
      {baixa.estornado_em ? (
        <Badge className="border-none bg-muted font-semibold text-muted-foreground">Estornada</Badge>
      ) : (
        <Button size="sm" variant="outline" disabled={pendente} onClick={() => iniciarTransicao(acionarEstorno)}>
          {pendente ? "Estornando..." : "Estornar"}
        </Button>
      )}
    </div>
  );
}

export function HistoricoBaixasSheet({
  aberto,
  onAbertoChange,
  descricao,
  baixas,
}: {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  descricao: string;
  baixas: BaixaHistorico[];
}) {
  return (
    <Sheet open={aberto} onOpenChange={onAbertoChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Histórico de baixas</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">
          <p className="mb-2 text-sm font-medium text-foreground">{descricao}</p>
          {baixas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma baixa registrada ainda.</p>
          ) : (
            baixas.map((baixa) => <LinhaBaixa key={baixa.id} baixa={baixa} />)
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
