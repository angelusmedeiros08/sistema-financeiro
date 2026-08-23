"use client";

import Link from "next/link";
import { criarColunaLista, TabelaLista, BadgeStatusLista } from "@/components/tabela/tabela-lista";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { formatarMoeda } from "@/lib/formatacao";
import { ToggleAtivoContaButton } from "./toggle-ativo-button";

export type LinhaContaFinanceira = {
  id: string;
  nome: string;
  tipo: string | null;
  banco: string | null;
  saldo_inicial: number;
  ativo: boolean;
};

const ROTULO_TIPO: Record<string, string> = {
  BANCO: "Conta bancária",
  CAIXA: "Caixa",
  CARTEIRA_DIGITAL: "Carteira digital",
};

const helper = criarColunaLista<LinhaContaFinanceira>();

const colunas = helper.columns([
  helper.accessor("nome", {
    id: "nome",
    header: "Nome",
    cell: (info) => <span className="font-semibold text-foreground">{info.getValue()}</span>,
  }),
  helper.accessor((c) => ROTULO_TIPO[c.tipo ?? ""] ?? c.tipo ?? "-", {
    id: "tipo",
    header: "Tipo",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor((c) => c.banco ?? "-", {
    id: "banco",
    header: "Banco",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor("saldo_inicial", {
    id: "saldoInicial",
    header: "Saldo inicial",
    meta: { numerica: true },
    cell: (info) => <span className="tabular-nums text-foreground">{formatarMoeda(Number(info.getValue()))}</span>,
  }),
  helper.accessor("ativo", {
    id: "situacao",
    header: "Situação",
    cell: (info) => <BadgeStatusLista variante={info.getValue() ? "positivo" : "neutro"}>{info.getValue() ? "Ativa" : "Inativa"}</BadgeStatusLista>,
  }),
]);

export function TabelaContasFinanceiras({ contas }: { contas: LinhaContaFinanceira[] }) {
  return (
    <TabelaLista
      titulo="Contas financeiras"
      data={contas}
      columns={colunas}
      busca={false}
      textoVazio="Nenhuma conta financeira cadastrada ainda."
      acoes={(c) => (
        <>
          <DropdownMenuItem asChild>
            <Link href={`/configuracoes/contas-financeiras/${c.id}/conciliar`}>Conciliar</Link>
          </DropdownMenuItem>
          <ToggleAtivoContaButton id={c.id} ativo={c.ativo} />
        </>
      )}
    />
  );
}
