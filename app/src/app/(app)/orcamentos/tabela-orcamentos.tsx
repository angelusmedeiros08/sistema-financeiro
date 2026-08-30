"use client";

import { Badge } from "@/components/ui/badge";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { TabelaLista, criarColunaLista } from "@/components/tabela/tabela-lista";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarDataIsoParaBR } from "@/lib/importacao/locale-br";
import type { Database } from "@/utils/supabase/database.types";
import { cn } from "@/lib/utils";

type StatusOrcamentoComercial = Database["public"]["Enums"]["status_orcamento_comercial"];

type LinhaOrcamento = {
  id: string;
  numero: number;
  pessoaNome: string;
  dataEmissao: string;
  validade: string | null;
  status: StatusOrcamentoComercial;
  valorTotal: number;
};

export const MAPA_STATUS_ORCAMENTO: Record<StatusOrcamentoComercial, { rotulo: string; className: string }> = {
  RASCUNHO: { rotulo: "Rascunho", className: "bg-muted text-muted-foreground" },
  ENVIADO: { rotulo: "Enviado", className: "bg-amber-500/12 text-amber-700 dark:text-amber-400" },
  APROVADO: { rotulo: "Aprovado", className: "bg-positivo/12 text-positivo-foreground" },
  RECUSADO: { rotulo: "Recusado", className: "bg-destructive/12 text-destructive-foreground" },
  EXPIRADO: { rotulo: "Expirado", className: "bg-muted text-muted-foreground" },
};

const helper = criarColunaLista<LinhaOrcamento>();

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
  helper.accessor((v) => (v.validade ? formatarDataIsoParaBR(v.validade) : "—"), {
    id: "validade",
    header: "Validade",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor("status", {
    id: "situacao",
    header: "Situação",
    cell: (info) => {
      const { rotulo, className } = MAPA_STATUS_ORCAMENTO[info.getValue()];
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

export function TabelaOrcamentos({
  orcamentos,
  paginacao,
}: {
  orcamentos: LinhaOrcamento[];
  paginacao?: { pagina: number; totalPaginas: number; totalRegistros: number; tamanhoPagina: number; hrefBase: string };
}) {
  if (orcamentos.length === 0 && !paginacao) {
    return <EstadoVazio texto="Nenhum orçamento nessa situação." />;
  }

  return (
    <TabelaLista
      titulo="Orçamentos"
      data={orcamentos}
      columns={colunas}
      busca={false}
      textoVazio="Nenhum orçamento nessa situação."
      linkPara={(o) => `/orcamentos/${o.id}`}
      paginacaoServidor={paginacao}
    />
  );
}
