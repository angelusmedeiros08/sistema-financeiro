"use client";

// Wrapper client component — mesmo motivo dos outros. Linha aqui é período,
// sem ícone/badge. Entradas/Saídas (e Previsto) usam cor fixa (categoria de
// fluxo, não sinal a ler) — mesma regra já aplicada em centro-custo-tabela.tsx.
// Duas tabelas com formato de dado diferente (Diário vs Previsto×Realizado),
// cada uma com seu componente — não dá pra generalizar sem forçar união de
// tipo sem necessidade real.
import type { PontoFluxoCaixa, PontoPrevistoRealizado } from "@/lib/relatorios/fluxo-caixa";
import { formatarNumeroCompacto } from "@/lib/formatacao";
import { TabelaLista, criarColunaLista, ValorLista } from "@/components/tabela/tabela-lista";

const helperDiario = criarColunaLista<PontoFluxoCaixa>();

const colunasDiario = helperDiario.columns([
  helperDiario.accessor("chave", { id: "periodo", header: "Período", cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span> }),
  helperDiario.accessor("entradas", {
    id: "entradas",
    header: "Entradas",
    meta: { numerica: true },
    cell: (info) => <span className="tabular-nums text-positivo">{formatarNumeroCompacto(info.getValue())}</span>,
  }),
  helperDiario.accessor("saidas", {
    id: "saidas",
    header: "Saídas",
    meta: { numerica: true },
    cell: (info) => <span className="tabular-nums text-destructive">{formatarNumeroCompacto(info.getValue())}</span>,
  }),
  helperDiario.accessor("saldoPeriodo", {
    id: "saldoPeriodo",
    header: "Saldo do período",
    meta: { numerica: true },
    cell: (info) => <ValorLista valor={info.getValue()} formatado={formatarNumeroCompacto(info.getValue())} />,
  }),
  helperDiario.accessor("saldoAcumulado", {
    id: "saldoAcumulado",
    header: "Saldo acumulado",
    meta: { numerica: true },
    cell: (info) => <span className="tabular-nums text-foreground">{formatarNumeroCompacto(info.getValue())}</span>,
  }),
]);

export function FluxoDiarioTabela({ pontos }: { pontos: PontoFluxoCaixa[] }) {
  return (
    <TabelaLista
      titulo="Entradas × Saídas por período"
      data={pontos}
      columns={colunasDiario}
      buscaPlaceholder="Buscar período…"
      textoVazio="Sem movimentação no período selecionado."
    />
  );
}

const helperPR = criarColunaLista<PontoPrevistoRealizado>();

const colunasPR = helperPR.columns([
  helperPR.accessor("chave", { id: "periodo", header: "Período", cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span> }),
  helperPR.accessor("previsto", {
    id: "previsto",
    header: "Previsto",
    meta: { numerica: true },
    cell: (info) => <span className="tabular-nums text-[#E3A62F]">{formatarNumeroCompacto(info.getValue())}</span>,
  }),
  helperPR.accessor("realizado", {
    id: "realizado",
    header: "Realizado",
    meta: { numerica: true },
    cell: (info) => <span className="tabular-nums text-positivo">{formatarNumeroCompacto(info.getValue())}</span>,
  }),
  helperPR.accessor("variacao", {
    id: "variacao",
    header: "Variação",
    meta: { numerica: true },
    cell: (info) => <ValorLista valor={info.getValue()} formatado={formatarNumeroCompacto(info.getValue())} />,
  }),
]);

export function FluxoPrevistoRealizadoTabela({ pontos }: { pontos: PontoPrevistoRealizado[] }) {
  return (
    <TabelaLista
      titulo="Vencimento previsto × Pagamento realizado"
      data={pontos}
      columns={colunasPR}
      buscaPlaceholder="Buscar período…"
      textoVazio="Sem movimentação no período selecionado."
    />
  );
}
