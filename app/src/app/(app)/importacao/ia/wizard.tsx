"use client";

import { useState } from "react";
import type { LinhaBrutaIA, ResolucaoEntidade, TipoEntidadeImportacao } from "@/lib/importacao/tipos";
import type { EntidadesExistentes } from "@/lib/importacao/resolucao";
import type { Database } from "@/utils/supabase/database.types";
import { PassoEntidades } from "../planilha/passo-entidades";
import { PassoPreview, type LinhaPronta } from "../planilha/passo-preview";
import { PassoResultado } from "../planilha/passo-resultado";
import { PassoEntradaIA } from "./passo-entrada-ia";

type Etapa = "entrada" | "entidades" | "preview" | "resultado";
type ContaFinanceira = { id: string; nome: string };
type CategoriaNova = { id: string; nome: string; tipo: Database["public"]["Enums"]["tipo_categoria"] };

const ETAPAS: { chave: Etapa; rotulo: string }[] = [
  { chave: "entrada", rotulo: "Entrada" },
  { chave: "entidades", rotulo: "Cadastros" },
  { chave: "preview", rotulo: "Revisão" },
  { chave: "resultado", rotulo: "Importação" },
];

const ESTADO_INICIAL = {
  etapa: "entrada" as Etapa,
  linhasIA: [] as LinhaBrutaIA[],
  contaFinanceiraId: "",
  nomeArquivo: "",
  resolucoes: null as Record<TipoEntidadeImportacao, Map<string, ResolucaoEntidade>> | null,
  linhasProntas: [] as LinhaPronta[],
  importacaoId: null as string | null,
};

// Reaproveita os 3 últimos passos do wizard de planilha sem alteração —
// depois que existe uma lista de LinhaBruta, resolver cadastros, revisar e
// comitar é exatamente o mesmo trabalho não importa se a linha veio de um
// Excel ou de uma extração por IA. Ver spec 2026-08-29-importacao-com-ia.
export function ImportarIAWizard({
  contasFinanceiras,
  entidadesExistentesIniciais,
}: {
  contasFinanceiras: ContaFinanceira[];
  entidadesExistentesIniciais: EntidadesExistentes;
}) {
  const [estado, setEstado] = useState(ESTADO_INICIAL);
  const [entidadesExistentes, setEntidadesExistentes] = useState(entidadesExistentesIniciais);

  function reiniciar() {
    setEstado(ESTADO_INICIAL);
  }

  const indiceAtual = ETAPAS.findIndex((e) => e.chave === estado.etapa);

  // Mapa de campos de baixa confiança por linha, derivado das linhas que a
  // IA devolveu — PassoPreview usa isso só pra destaque visual, opcional.
  const camposBaixaConfiancaPorLinha = new Map(estado.linhasIA.map((l) => [l.importKey, new Set(l.camposBaixaConfianca)]));

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
        {ETAPAS.map((e, i) => (
          <li key={e.chave} className="flex items-center gap-2">
            <span
              className={
                i === indiceAtual
                  ? "rounded-full bg-primary px-2.5 py-1 text-primary-foreground"
                  : i < indiceAtual
                    ? "rounded-full bg-positivo/12 px-2.5 py-1 text-positivo-foreground"
                    : "rounded-full bg-muted px-2.5 py-1"
              }
            >
              {i + 1}. {e.rotulo}
            </span>
            {i < ETAPAS.length - 1 && <span className="text-border">—</span>}
          </li>
        ))}
      </ol>

      {estado.etapa === "entrada" && (
        <PassoEntradaIA
          contasFinanceiras={contasFinanceiras}
          onAvancar={({ linhasIA, contaFinanceiraId, nomeArquivo }) =>
            setEstado((s) => ({ ...s, etapa: "entidades", linhasIA, contaFinanceiraId, nomeArquivo }))
          }
        />
      )}

      {estado.etapa === "entidades" && (
        <PassoEntidades
          linhasBrutas={estado.linhasIA}
          nomeArquivo={estado.nomeArquivo}
          entidadesExistentes={entidadesExistentes}
          colunasFoiPulado={false}
          formatoNumericoAssumido="BR"
          onRevisarColunas={() => {}}
          onVoltar={() => setEstado((s) => ({ ...s, etapa: "entrada" }))}
          onAvancar={(resolucoes, categoriasNovas: CategoriaNova[], importacaoId) => {
            if (categoriasNovas.length > 0) {
              setEntidadesExistentes((atual) => ({ ...atual, categorias: [...atual.categorias, ...categoriasNovas] }));
            }
            setEstado((s) => ({ ...s, etapa: "preview", resolucoes, importacaoId }));
          }}
        />
      )}

      {estado.etapa === "preview" && estado.resolucoes && (
        <PassoPreview
          linhasBrutas={estado.linhasIA}
          formatoNumerico="BR"
          resolucoes={estado.resolucoes}
          entidadesExistentes={entidadesExistentes}
          camposBaixaConfiancaPorLinha={camposBaixaConfiancaPorLinha}
          onVoltar={() => setEstado((s) => ({ ...s, etapa: "entidades" }))}
          onImportar={(linhasProntas) => setEstado((s) => ({ ...s, etapa: "resultado", linhasProntas }))}
        />
      )}

      {estado.etapa === "resultado" && (
        <PassoResultado
          linhas={estado.linhasProntas}
          totalLinhasArquivo={estado.linhasIA.length}
          contaFinanceiraId={estado.contaFinanceiraId}
          importacaoId={estado.importacaoId}
          onReiniciar={reiniciar}
        />
      )}
    </div>
  );
}
