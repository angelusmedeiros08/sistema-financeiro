"use client";

import { useState } from "react";
import { DotsThree } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BaixaSheet } from "./baixa-sheet";
import { RenegociarSheet } from "./renegociar-sheet";
import { CancelarDialog } from "./cancelar-dialog";
import { HistoricoBaixasSheet, type BaixaHistorico } from "./historico-baixas-sheet";

type ContaFinanceira = { id: string; nome: string };
type SheetAtivo = "baixa" | "renegociar" | "historico" | null;

export function AcoesParcela({
  parcelaId,
  descricao,
  valor,
  dataVencimento,
  saldoResidual,
  status,
  baixas,
  contasFinanceiras,
  rotuloAcaoBaixa,
}: {
  parcelaId: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  saldoResidual: number;
  status: string;
  baixas: BaixaHistorico[];
  contasFinanceiras: ContaFinanceira[];
  rotuloAcaoBaixa: string;
}) {
  const [sheetAtivo, setSheetAtivo] = useState<SheetAtivo>(null);
  const [cancelarAberto, setCancelarAberto] = useState(false);

  const temBaixaValida = baixas.some((b) => !b.estornado_em);
  const podeReceberBaixa = status === "PENDENTE" || status === "RECEBIDO_PARCIAL" || status === "RENEGOCIADO";
  const podeRenegociar = status !== "QUITADO" && status !== "CANCELADO";
  const podeCancelar = status === "PENDENTE" && !temBaixaValida;
  const podeVerHistorico = baixas.length > 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1">
            Ações
            <DotsThree size={15} weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {podeReceberBaixa && (
            <DropdownMenuItem onSelect={() => setSheetAtivo("baixa")}>{rotuloAcaoBaixa}</DropdownMenuItem>
          )}
          {podeRenegociar && (
            <DropdownMenuItem onSelect={() => setSheetAtivo("renegociar")}>Renegociar</DropdownMenuItem>
          )}
          {podeVerHistorico && (
            <DropdownMenuItem onSelect={() => setSheetAtivo("historico")}>Ver histórico</DropdownMenuItem>
          )}
          {podeCancelar && (
            <DropdownMenuItem variant="destructive" onSelect={() => setCancelarAberto(true)}>
              Cancelar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <BaixaSheet
        aberto={sheetAtivo === "baixa"}
        onAbertoChange={(v) => setSheetAtivo(v ? "baixa" : null)}
        parcelaId={parcelaId}
        descricao={descricao}
        saldoResidual={saldoResidual}
        contasFinanceiras={contasFinanceiras}
        rotuloAcao={rotuloAcaoBaixa}
      />
      <RenegociarSheet
        aberto={sheetAtivo === "renegociar"}
        onAbertoChange={(v) => setSheetAtivo(v ? "renegociar" : null)}
        parcelaId={parcelaId}
        descricao={descricao}
        valor={valor}
        dataVencimentoAtual={dataVencimento}
      />
      <HistoricoBaixasSheet
        aberto={sheetAtivo === "historico"}
        onAbertoChange={(v) => setSheetAtivo(v ? "historico" : null)}
        descricao={descricao}
        baixas={baixas}
      />
      <CancelarDialog
        aberto={cancelarAberto}
        onAbertoChange={setCancelarAberto}
        parcelaId={parcelaId}
        descricao={descricao}
      />
    </>
  );
}
