"use client";

import { useState } from "react";
import type { ResultadoParse } from "@/lib/importacao/parse";
import type { FormatoNumerico } from "@/lib/importacao/locale-br";
import type { LinhaBruta, ResolucaoEntidade, TipoEntidadeImportacao } from "@/lib/importacao/tipos";
import type { EntidadesExistentes } from "@/lib/importacao/resolucao";
import type { Database } from "@/utils/supabase/database.types";
import { PassoUpload } from "./passo-upload";
import { PassoMapeamento } from "./passo-mapeamento";
import { PassoEntidades } from "./passo-entidades";
import { PassoPreview, type LinhaPronta } from "./passo-preview";
import { PassoResultado } from "./passo-resultado";

type Etapa = "upload" | "mapeamento" | "entidades" | "preview" | "resultado";
type ContaFinanceira = { id: string; nome: string };
type CategoriaNova = { id: string; nome: string; tipo: Database["public"]["Enums"]["tipo_categoria"] };

const ETAPAS: { chave: Etapa; rotulo: string }[] = [
  { chave: "upload", rotulo: "Arquivo" },
  { chave: "mapeamento", rotulo: "Colunas" },
  { chave: "entidades", rotulo: "Cadastros" },
  { chave: "preview", rotulo: "Revisão" },
  { chave: "resultado", rotulo: "Importação" },
];

const ESTADO_INICIAL = {
  etapa: "upload" as Etapa,
  buffer: null as ArrayBuffer | null,
  parse: null as ResultadoParse | null,
  contaFinanceiraId: "",
  linhasBrutas: [] as LinhaBruta[],
  formatoNumerico: "BR" as FormatoNumerico,
  resolucoes: null as Record<TipoEntidadeImportacao, Map<string, ResolucaoEntidade>> | null,
  linhasProntas: [] as LinhaPronta[],
};

export function ImportarPlanilhaWizard({
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

      {estado.etapa === "upload" && (
        <PassoUpload
          contasFinanceiras={contasFinanceiras}
          onAvancar={({ buffer, parse, contaFinanceiraId }) =>
            setEstado((s) => ({ ...s, etapa: "mapeamento", buffer, parse, contaFinanceiraId }))
          }
        />
      )}

      {estado.etapa === "mapeamento" && estado.parse && (
        <PassoMapeamento
          parseInicial={estado.parse}
          buffer={estado.buffer}
          onVoltar={() => setEstado({ ...ESTADO_INICIAL, etapa: "upload" })}
          onAvancar={({ linhasBrutas, formatoNumerico }) => setEstado((s) => ({ ...s, etapa: "entidades", linhasBrutas, formatoNumerico }))}
        />
      )}

      {estado.etapa === "entidades" && (
        <PassoEntidades
          linhasBrutas={estado.linhasBrutas}
          entidadesExistentes={entidadesExistentes}
          onVoltar={() => setEstado((s) => ({ ...s, etapa: "mapeamento" }))}
          onAvancar={(resolucoes, categoriasNovas: CategoriaNova[]) => {
            if (categoriasNovas.length > 0) {
              setEntidadesExistentes((atual) => ({ ...atual, categorias: [...atual.categorias, ...categoriasNovas] }));
            }
            setEstado((s) => ({ ...s, etapa: "preview", resolucoes }));
          }}
        />
      )}

      {estado.etapa === "preview" && estado.resolucoes && (
        <PassoPreview
          linhasBrutas={estado.linhasBrutas}
          formatoNumerico={estado.formatoNumerico}
          resolucoes={estado.resolucoes}
          entidadesExistentes={entidadesExistentes}
          onVoltar={() => setEstado((s) => ({ ...s, etapa: "entidades" }))}
          onImportar={(linhasProntas) => setEstado((s) => ({ ...s, etapa: "resultado", linhasProntas }))}
        />
      )}

      {estado.etapa === "resultado" && (
        <PassoResultado linhas={estado.linhasProntas} contaFinanceiraId={estado.contaFinanceiraId} onReiniciar={reiniciar} />
      )}
    </div>
  );
}
