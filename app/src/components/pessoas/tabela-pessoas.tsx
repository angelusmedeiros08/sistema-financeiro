"use client";

import { EstadoVazio } from "@/components/ui/estado-vazio";
import { TabelaLista, criarColunaLista } from "@/components/tabela/tabela-lista";
import { corPorNome } from "@/lib/cor-por-nome";
import type { LinhaPessoa } from "@/lib/pessoas/buscar-pessoa";

const helper = criarColunaLista<LinhaPessoa>();

const colunas = helper.columns([
  helper.accessor("nome", {
    id: "nome",
    header: "Nome",
    cell: (info) => {
      const p = info.row.original;
      return (
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: corPorNome(p.nome).texto }}
          >
            {p.nome.charAt(0).toUpperCase()}
          </span>
          <span className="font-semibold text-foreground">{p.nome}</span>
        </div>
      );
    },
  }),
  helper.accessor("documento", {
    id: "documento",
    header: "Documento",
    cell: (info) => <span className="text-muted-foreground">{info.getValue() ?? "-"}</span>,
  }),
  helper.accessor("email", {
    id: "email",
    header: "E-mail",
    cell: (info) => <span className="text-muted-foreground">{info.getValue() ?? "-"}</span>,
  }),
  helper.accessor("telefone", {
    id: "telefone",
    header: "Telefone",
    cell: (info) => <span className="text-muted-foreground">{info.getValue() ?? "-"}</span>,
  }),
  helper.accessor((p) => (p.cidade && p.uf ? `${p.cidade}/${p.uf}` : "-"), {
    id: "cidadeUf",
    header: "Cidade/UF",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),
]);

export function TabelaPessoas({
  pessoas,
  caminhoBase,
  textoVazio,
}: {
  pessoas: LinhaPessoa[];
  caminhoBase: "clientes" | "fornecedores";
  textoVazio: string;
}) {
  if (pessoas.length === 0) {
    return <EstadoVazio texto={textoVazio} />;
  }

  return (
    <TabelaLista
      titulo={caminhoBase === "clientes" ? "Clientes" : "Fornecedores"}
      data={pessoas}
      columns={colunas}
      buscaPlaceholder="Buscar por nome, documento, e-mail…"
      linkPara={(p) => `/${caminhoBase}/${p.id}`}
    />
  );
}
