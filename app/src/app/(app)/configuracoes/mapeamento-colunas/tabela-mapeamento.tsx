"use client";

import { useMemo, useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { TabelaLista, criarColunaLista } from "@/components/tabela/tabela-lista";
import { DotsThree } from "@phosphor-icons/react/dist/ssr";
import { apagarRegraMapeamentoAction } from "./actions";

type RegraMapeamentoLinha = {
  id: string;
  tipoWizard: string;
  cabecalhoNormalizado: string;
  chaveColunaRotulo: string;
  criadoEm: string;
};

const helper = criarColunaLista<RegraMapeamentoLinha>();

export function TabelaMapeamento({ regrasIniciais }: { regrasIniciais: RegraMapeamentoLinha[] }) {
  const [regras, setRegras] = useState(regrasIniciais);
  const [erro, setErro] = useState("");
  const [statusAnuncio, setStatusAnuncio] = useState("");

  async function apagar(regraId: string, cabecalho: string) {
    setErro("");
    const resultado = await apagarRegraMapeamentoAction(regraId);
    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }
    setRegras((atual) => atual.filter((r) => r.id !== regraId));
    // O botão de ações daquela linha some junto com ela, então o foco cai
    // pro documento sem aviso nenhum — a região de status compensa isso
    // pra quem usa leitor de tela.
    setStatusAnuncio(`Regra de "${cabecalho}" excluída.`);
  }

  const colunas = useMemo(
    () =>
      helper.columns([
        helper.accessor("cabecalhoNormalizado", {
          id: "cabecalho",
          header: "Cabeçalho da planilha",
          cell: (info) => <span className="font-semibold text-foreground">{info.getValue()}</span>,
        }),
        helper.accessor("chaveColunaRotulo", { id: "campo", header: "Mapeia para" }),
        helper.accessor("tipoWizard", {
          id: "wizard",
          header: "Importação",
          cell: (info) => (
            <Badge variant="outline" className="border-none bg-muted text-[10px] font-semibold text-muted-foreground">
              {info.getValue() === "financeiro" ? "Lançamentos financeiros" : "Clientes/Fornecedores"}
            </Badge>
          ),
        }),
        helper.display({
          id: "_acoes",
          header: "",
          cell: ({ row }) => (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex size-7 items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Ações da regra "${row.original.cabecalhoNormalizado}"`}
                  >
                    <DotsThree size={18} weight="bold" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" onSelect={() => apagar(row.original.id, row.original.cabecalhoNormalizado)}>
                    <Trash size={14} />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        }),
      ]),
    [],
  );

  if (regras.length === 0) {
    return <EstadoVazio texto="Nenhuma regra ainda. Elas nascem sozinhas quando você corrige um mapeamento de coluna na importação de planilha." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <p role="status" className="sr-only">
        {statusAnuncio}
      </p>
      <TabelaLista titulo="Mapeamento de colunas" data={regras} columns={colunas} busca={false} textoVazio="Nenhuma regra ainda." />
    </div>
  );
}
