"use client";

import { Badge } from "@/components/ui/badge";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { TabelaLista, criarColunaLista } from "@/components/tabela/tabela-lista";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarDataIsoParaBR } from "@/lib/importacao/locale-br";
import type { Database } from "@/utils/supabase/database.types";
import { cn } from "@/lib/utils";

type StatusVenda = Database["public"]["Enums"]["status_venda"];

type LinhaVenda = {
  id: string;
  numero: number;
  pessoaNome: string;
  dataEmissao: string;
  status: StatusVenda;
  valorTotal: number;
};

const MAPA_STATUS: Record<StatusVenda, { rotulo: string; className: string }> = {
  RASCUNHO: { rotulo: "Rascunho", className: "bg-muted text-muted-foreground" },
  ENVIADO: { rotulo: "Enviado", className: "bg-amber-500/12 text-amber-700 dark:text-amber-400" },
  APROVADO: { rotulo: "Aprovada", className: "bg-positivo/12 text-positivo-foreground" },
  RECUSADO: { rotulo: "Recusada", className: "bg-destructive/12 text-destructive-foreground" },
};

const helper = criarColunaLista<LinhaVenda>();

const colunas = helper.columns([
  helper.accessor("numero", {
    id: "numero",
    header: "Número",
    cell: (info) => <span className="font-semibold text-foreground">#{info.getValue()}</span>,
  }),
  helper.accessor("pessoaNome", {
    id: "pessoa",
    header: "Cliente",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor((v) => formatarDataIsoParaBR(v.dataEmissao), {
    id: "data",
    header: "Data",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor("status", {
    id: "situacao",
    header: "Situação",
    cell: (info) => {
      const { rotulo, className } = MAPA_STATUS[info.getValue()];
      return (
        <Badge variant="outline" className={cn("border-none text-[10px] font-semibold", className)}>
          {rotulo}
        </Badge>
      );
    },
  }),
  helper.accessor("valorTotal", {
    id: "valor",
    header: "Valor",
    meta: { numerica: true },
    cell: (info) => <span className="tabular-nums text-foreground">{formatarMoeda(info.getValue())}</span>,
  }),
]);

export function TabelaVendas({
  vendas,
  paginacao,
}: {
  vendas: LinhaVenda[];
  /** Paginação real no servidor — `vendas` já é só a página atual. Ver `paginacaoServidor` em TabelaLista. */
  paginacao?: { pagina: number; totalPaginas: number; totalRegistros: number; tamanhoPagina: number; hrefBase: string };
}) {
  if (vendas.length === 0 && !paginacao) {
    return <EstadoVazio texto="Nenhuma venda nessa situação." />;
  }

  return (
    <TabelaLista
      titulo="Vendas"
      data={vendas}
      columns={colunas}
      busca={false}
      textoVazio="Nenhuma venda nessa situação."
      linkPara={(v) => `/vendas/${v.id}`}
      paginacaoServidor={paginacao}
    />
  );
}
