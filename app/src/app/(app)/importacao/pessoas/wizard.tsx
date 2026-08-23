"use client";

import { useState } from "react";
import type { ResultadoParse } from "@/lib/importacao/parse";
import type { CampoPersonalizadoDefinicao } from "@/lib/pessoas/buscar-pessoa";
import type { PessoaExistente } from "@/lib/pessoas/importacao/correspondencia";
import type { ColunaChave } from "@/lib/pessoas/importacao/tipos";
import { PassoUpload } from "./passo-upload";
import { PassoMapeamento } from "./passo-mapeamento";
import { PassoRevisao, type LinhaPronta } from "./passo-revisao";
import { PassoResultado } from "./passo-resultado";

type Etapa = "upload" | "mapeamento" | "revisao" | "resultado";

const ETAPAS: { chave: Etapa; rotulo: string }[] = [
  { chave: "upload", rotulo: "Arquivo" },
  { chave: "mapeamento", rotulo: "Colunas" },
  { chave: "revisao", rotulo: "Revisão" },
  { chave: "resultado", rotulo: "Importação" },
];

const ESTADO_INICIAL = {
  etapa: "upload" as Etapa,
  buffer: null as ArrayBuffer | null,
  parse: null as ResultadoParse | null,
  nomeArquivo: "",
  linhasTexto: [] as string[][],
  mapeamento: {} as Partial<Record<ColunaChave, number>>,
  linhasProntas: [] as LinhaPronta[],
};

export function ImportarPessoasWizard({
  pessoasExistentesIniciais,
  camposPersonalizados,
}: {
  pessoasExistentesIniciais: PessoaExistente[];
  camposPersonalizados: CampoPersonalizadoDefinicao[];
}) {
  const [estado, setEstado] = useState(ESTADO_INICIAL);
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
          camposPersonalizados={camposPersonalizados}
          onAvancar={({ arquivo, buffer, parse }) => setEstado((s) => ({ ...s, etapa: "mapeamento", buffer, parse, nomeArquivo: arquivo.name }))}
        />
      )}

      {estado.etapa === "mapeamento" && estado.parse && (
        <PassoMapeamento
          parseInicial={estado.parse}
          buffer={estado.buffer}
          camposPersonalizados={camposPersonalizados}
          onVoltar={() => setEstado({ ...ESTADO_INICIAL, etapa: "upload" })}
          onAvancar={({ linhasTexto, mapeamento }) => setEstado((s) => ({ ...s, etapa: "revisao", linhasTexto, mapeamento }))}
        />
      )}

      {estado.etapa === "revisao" && (
        <PassoRevisao
          linhasTexto={estado.linhasTexto}
          mapeamento={estado.mapeamento}
          pessoasExistentes={pessoasExistentesIniciais}
          camposPersonalizados={camposPersonalizados}
          onVoltar={() => setEstado((s) => ({ ...s, etapa: "mapeamento" }))}
          onImportar={(linhasProntas) => setEstado((s) => ({ ...s, etapa: "resultado", linhasProntas }))}
        />
      )}

      {estado.etapa === "resultado" && (
        <PassoResultado linhas={estado.linhasProntas} nomeArquivo={estado.nomeArquivo} onReiniciar={() => setEstado(ESTADO_INICIAL)} />
      )}
    </div>
  );
}
