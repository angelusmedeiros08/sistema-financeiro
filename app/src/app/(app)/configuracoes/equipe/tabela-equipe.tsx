"use client";

import { criarColunaLista, TabelaLista, BadgeStatusLista } from "@/components/tabela/tabela-lista";
import { corPorNome } from "@/lib/cor-por-nome";
import { ROTULO_PAPEL } from "@/lib/tenant/rotulos";
import { AcessoToggleButton } from "./acesso-toggle-button";
import { CancelarConviteButton } from "./cancelar-convite-button";

export type LinhaMembro = {
  usuario_id: string;
  papel: string;
  ativo: boolean;
  senha_definida: boolean;
  usuarios: { nome: string | null; email: string | null } | null;
};

const helper = criarColunaLista<LinhaMembro>();

const colunas = helper.columns([
    helper.accessor((m) => m.usuarios?.nome ?? m.usuarios?.email ?? "?", {
      id: "nome",
      header: "Nome",
      cell: (info) => {
        const nome = info.getValue();
        return (
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: corPorNome(nome).texto }}
            >
              {nome.charAt(0).toUpperCase()}
            </span>
            <span className="font-semibold text-foreground">{info.row.original.usuarios?.nome ?? "-"}</span>
          </div>
        );
      },
    }),
    helper.accessor((m) => m.usuarios?.email ?? "-", {
      id: "email",
      header: "E-mail",
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    }),
    helper.accessor((m) => ROTULO_PAPEL[m.papel] ?? m.papel, {
      id: "papel",
      header: "Papel",
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    }),
    helper.accessor((m) => !m.senha_definida, {
      id: "situacao",
      header: "Situação",
      cell: (info) => {
        const m = info.row.original;
        const pendente = !m.senha_definida;
        return (
          <BadgeStatusLista variante={pendente ? "pendente" : m.ativo ? "positivo" : "neutro"}>
            {pendente ? "Convite pendente" : m.ativo ? "Ativo" : "Revogado"}
          </BadgeStatusLista>
        );
      },
    }),
]);

export function TabelaEquipe({ membros, souAdmin, usuarioAtualId }: { membros: LinhaMembro[]; souAdmin: boolean; usuarioAtualId: string }) {
  return (
    <TabelaLista
      titulo="Membros"
      data={membros}
      columns={colunas}
      busca={false}
      textoVazio="Nenhum membro na equipe ainda."
      acoes={
        souAdmin
          ? (m) => {
              if (m.usuario_id === usuarioAtualId) return null;
              const pendente = !m.senha_definida;
              return pendente ? <CancelarConviteButton usuarioId={m.usuario_id} /> : <AcessoToggleButton usuarioId={m.usuario_id} ativo={m.ativo} />;
            }
          : undefined
      }
    />
  );
}
