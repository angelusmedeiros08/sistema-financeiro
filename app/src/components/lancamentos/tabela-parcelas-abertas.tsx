"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { TabelaLista, criarColunaLista } from "@/components/tabela/tabela-lista";
import { formatarMoeda } from "@/lib/formatacao";
import { ROTULO_STATUS_PARCELA, COR_STATUS_PARCELA } from "@/lib/status-parcela";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";
import { cancelarParcelasEmLoteAction } from "@/lib/contabil/ciclo-vida-parcela-actions";
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

// Barra de ação da seleção em lote — só cancela parcelas que ainda estão
// canceláveis (PENDENTE/RENEGOCIADO); a acaoLoteAction já rejeita as que
// não estiverem (ex.: já tem baixa), reportado por linha em vez de travar
// a seleção inteira no primeiro erro.
function BarraCancelarEmLote({ parcelaIds, limpar }: { parcelaIds: string[]; limpar: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mostrarCampo, setMostrarCampo] = useState(false);

  async function confirmar() {
    if (!motivo.trim()) return;
    setEnviando(true);
    const resultado = await cancelarParcelasEmLoteAction(parcelaIds, motivo);
    setEnviando(false);
    if ("erro" in resultado) {
      notificarResultado(resultado, "");
      return;
    }
    notificarResultado(
      { sucesso: true },
      resultado.falhas.length > 0
        ? `${resultado.canceladas} cancelada(s), ${resultado.falhas.length} não puderam ser canceladas.`
        : `${resultado.canceladas} parcela(s) cancelada(s).`,
    );
    setMotivo("");
    setMostrarCampo(false);
    limpar();
  }

  if (!mostrarCampo) {
    return (
      <Button type="button" variant="destructive" size="sm" onClick={() => setMostrarCampo(true)}>
        Cancelar selecionadas
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo do cancelamento..."
        className="h-8 w-56 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none focus:border-primary"
      />
      <Button type="button" variant="destructive" size="sm" disabled={enviando || !motivo.trim()} onClick={confirmar}>
        {enviando ? "Cancelando..." : "Confirmar"}
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={enviando} onClick={() => setMostrarCampo(false)}>
        Voltar
      </Button>
    </div>
  );
}

// Cada linha navega pra página cheia de detalhe da parcela (ações de dar
// baixa, renegociar, histórico e cancelar vivem lá, não mais num dropdown
// aqui na tabela — ver docs/mapeamento-conta-azul-produto-ui.md §2.1).
// `acaoLote`: seleção múltipla + "Cancelar selecionadas" (Fatia 5 do
// dossiê UX) — só faz sentido nas telas onde a situação "Em aberto" é o
// filtro comum (Contas a Pagar/Receber); quem chama decide.
export function TabelaParcelasAbertas({
  parcelas,
  textoVazio,
  caminhoBase,
  titulo = "Parcelas",
  paginacao,
  acaoLote = false,
}: {
  parcelas: ParcelaAberta[];
  textoVazio: string;
  caminhoBase: "contas-a-pagar" | "contas-a-receber";
  titulo?: string;
  /** Paginação real no servidor — `parcelas` já é só a página atual. Ver `paginacaoServidor` em TabelaLista. */
  paginacao?: { pagina: number; totalPaginas: number; totalRegistros: number; tamanhoPagina: number; hrefBase: string };
  acaoLote?: boolean;
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  if (parcelas.length === 0 && !paginacao) {
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
      paginacaoServidor={paginacao}
      selecao={
        acaoLote
          ? {
              idDaLinha: (p) => p.id,
              selecionados,
              onSelecionadosChange: setSelecionados,
              barraAcao: (ids, limpar) => <BarraCancelarEmLote parcelaIds={ids} limpar={limpar} />,
            }
          : undefined
      }
    />
  );
}
