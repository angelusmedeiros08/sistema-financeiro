"use client";

// Wrapper client component — mesmo motivo dos outros (dre/dfc-matriz-tabela):
// a página é Server Component, a coluna com célula em JSX precisa ficar do
// lado do cliente. Linha aqui é pessoa/empresa (cliente ou fornecedor), não
// categoria — reaproveita o mesmo avatar de iniciais colorido por nome já
// usado em Pessoas/Equipe (corPorNome), não o glifo de ícone do arquétipo
// lista original (esse é pra categoria de lançamento, não pra entidade).
import type { AgingPorParticipante } from "@/lib/relatorios/aging";
import { formatarNumeroCompacto } from "@/lib/formatacao";
import { corPorNome } from "@/lib/cor-por-nome";
import { TabelaLista, criarColunaLista } from "@/components/tabela/tabela-lista";

const helper = criarColunaLista<AgingPorParticipante>();

const colunas = helper.columns([
  helper.accessor("nome", {
    id: "nome",
    header: "Cliente/Fornecedor",
    cell: (info) => {
      const nome = info.getValue();
      return (
        <span className="flex items-center gap-2.5 font-medium text-foreground">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: corPorNome(nome).texto }}
          >
            {nome.charAt(0).toUpperCase()}
          </span>
          {nome}
        </span>
      );
    },
  }),
  helper.accessor("totalEmAberto", {
    id: "emAberto",
    header: "Em aberto",
    meta: { numerica: true },
    cell: (info) => <span className="font-semibold tabular-nums">{formatarNumeroCompacto(info.getValue())}</span>,
  }),
  helper.accessor("diasDeAtrasoMaximo", {
    id: "atraso",
    header: "Atraso máx.",
    meta: { numerica: true },
    cell: (info) => {
      const dias = info.getValue();
      return <span className={dias > 0 ? "text-[#B23A2E]" : "text-muted-foreground"}>{dias > 0 ? `${dias} dias` : "em dia"}</span>;
    },
  }),
]);

// Top 10 por desenho (o rótulo já diz "Maiores devedores/credores" — é um
// ranking curto, não um cadastro completo), então sem paginação de propósito.
export function AgingParticipantesTabela({ titulo, linhas }: { titulo: string; linhas: AgingPorParticipante[] }) {
  return <TabelaLista titulo={titulo} data={linhas.slice(0, 10)} columns={colunas} busca={false} textoVazio="Nada em aberto." />;
}
