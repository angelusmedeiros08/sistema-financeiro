"use client";

import { Badge } from "@/components/ui/badge";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { TabelaLista, criarColunaLista } from "@/components/tabela/tabela-lista";
import { formatarMoeda } from "@/lib/formatacao";
import { ROTULO_STATUS_PARCELA, COR_STATUS_PARCELA } from "@/lib/status-parcela";
import { cn } from "@/lib/utils";

type BaixaResumo = { valor_pago: number; estornado_em: string | null };

type ParcelaAberta = {
  id: string;
  valor: number;
  data_vencimento: string;
  status: string;
  baixas: BaixaResumo[] | null;
  eventos_financeiros: { descricao: string | null; pessoas: { nome: string } | null } | null;
};

type LinhaParcela = ParcelaAberta & { saldoResidual: number; chaveStatus: string; diasEmAtraso: number };

const helper = criarColunaLista<LinhaParcela>();

const colunas = helper.columns([
  helper.accessor((p) => p.eventos_financeiros?.descricao ?? "Sem descrição", {
    id: "descricao",
    header: "Descrição",
    cell: (info) => <span className="font-semibold text-foreground">{info.getValue()}</span>,
  }),
  helper.accessor((p) => p.eventos_financeiros?.pessoas?.nome ?? "-", {
    id: "pessoa",
    header: "Pessoa",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor((p) => new Date(p.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR"), {
    id: "vencimento",
    header: "Vencimento",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.display({
    id: "situacao",
    header: "Situação",
    cell: ({ row }) => {
      const p = row.original;
      return (
        <Badge className={cn("border-none font-semibold", COR_STATUS_PARCELA[p.chaveStatus])}>
          {ROTULO_STATUS_PARCELA[p.chaveStatus] ?? p.chaveStatus}
          {p.chaveStatus === "ATRASADO" && ` · ${p.diasEmAtraso}d`}
        </Badge>
      );
    },
  }),
  helper.accessor("saldoResidual", {
    id: "saldoResidual",
    header: "Em aberto",
    meta: { numerica: true },
    cell: (info) => <span className="font-semibold tabular-nums text-foreground">{formatarMoeda(info.getValue())}</span>,
  }),
]);

// Cada linha navega pra página cheia de detalhe da parcela (ações de dar
// baixa, renegociar, histórico e cancelar vivem lá, não mais num dropdown
// aqui na tabela — ver docs/mapeamento-conta-azul-produto-ui.md §2.1).
export function TabelaParcelasAbertas({
  parcelas,
  textoVazio,
  caminhoBase,
  titulo = "Parcelas",
}: {
  parcelas: ParcelaAberta[];
  textoVazio: string;
  caminhoBase: "contas-a-pagar" | "contas-a-receber";
  titulo?: string;
}) {
  if (parcelas.length === 0) {
    return <EstadoVazio texto={textoVazio} />;
  }

  const hojeISO = new Date().toISOString().slice(0, 10);

  const linhas: LinhaParcela[] = parcelas.map((parcela) => {
    const baixas = parcela.baixas ?? [];
    const somaPaga = baixas.filter((b) => !b.estornado_em).reduce((acc, b) => acc + Number(b.valor_pago), 0);
    const saldoResidual = Number(parcela.valor) - somaPaga;
    const atrasada = (parcela.status === "PENDENTE" || parcela.status === "RENEGOCIADO") && parcela.data_vencimento < hojeISO;
    const chaveStatus = atrasada ? "ATRASADO" : parcela.status;
    const diasEmAtraso = atrasada ? Math.round((Date.parse(hojeISO) - Date.parse(parcela.data_vencimento)) / 86_400_000) : 0;
    return { ...parcela, saldoResidual, chaveStatus, diasEmAtraso };
  });

  return (
    <TabelaLista
      titulo={titulo}
      data={linhas}
      columns={colunas}
      busca={false}
      textoVazio={textoVazio}
      linkPara={(p) => `/${caminhoBase}/${p.id}`}
    />
  );
}
