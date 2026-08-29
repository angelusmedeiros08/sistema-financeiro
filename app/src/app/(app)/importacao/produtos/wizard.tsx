"use client";

import { useState } from "react";
import type { ResultadoParse } from "@/lib/importacao/parse";
import type { ColunaChaveProduto, LinhaBrutaProduto } from "@/lib/importacao/produtos/tipos";
import type { ResolucaoEntidade } from "@/lib/importacao/tipos";
import { montarLinhasBrutasProduto } from "@/lib/importacao/produtos/template";
import { PassoUpload } from "./passo-upload";
import { PassoMapeamento } from "./passo-mapeamento";
import { PassoCadastros, type CategoriaReceita, type CategoriaNovaProduto } from "./passo-cadastros";

type Etapa = "upload" | "mapeamento" | "cadastros" | "revisao" | "resultado";

const ETAPAS: { chave: Etapa; rotulo: string }[] = [
  { chave: "upload", rotulo: "Arquivo" },
  { chave: "mapeamento", rotulo: "Colunas" },
  { chave: "cadastros", rotulo: "Cadastros" },
  { chave: "revisao", rotulo: "Revisão" },
  { chave: "resultado", rotulo: "Importação" },
];

const ESTADO_INICIAL = {
  etapa: "upload" as Etapa,
  buffer: null as ArrayBuffer | null,
  parse: null as ResultadoParse | null,
  linhasTexto: [] as string[][],
  mapeamento: {} as Partial<Record<ColunaChaveProduto, number>>,
  linhasBrutas: [] as LinhaBrutaProduto[],
  resolucaoCategoria: null as Map<string, ResolucaoEntidade> | null,
};

// Fatias 1-4 do plano — Upload, Mapeamento e Cadastros funcionam de verdade.
// Revisão/Resultado chegam na Fatia 5; até lá o botão "Continuar" de
// Cadastros cai num placeholder honesto em vez de fingir que a etapa existe.
export function ImportarProdutosWizard({ categoriasReceitaIniciais }: { categoriasReceitaIniciais: CategoriaReceita[] }) {
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
        <PassoUpload onAvancar={({ buffer, parse }) => setEstado((s) => ({ ...s, etapa: "mapeamento", buffer, parse }))} />
      )}

      {estado.etapa === "mapeamento" && estado.parse && (
        <PassoMapeamento
          parseInicial={estado.parse}
          buffer={estado.buffer}
          onVoltar={() => setEstado({ ...ESTADO_INICIAL, etapa: "upload" })}
          onAvancar={({ linhasTexto, mapeamento }) =>
            setEstado((s) => ({ ...s, etapa: "cadastros", linhasTexto, mapeamento, linhasBrutas: montarLinhasBrutasProduto(linhasTexto, mapeamento) }))
          }
        />
      )}

      {estado.etapa === "cadastros" && (
        <PassoCadastros
          linhasBrutas={estado.linhasBrutas}
          categoriasExistentesIniciais={categoriasReceitaIniciais}
          onVoltar={() => setEstado((s) => ({ ...s, etapa: "mapeamento" }))}
          onAvancar={(resolucaoCategoria: Map<string, ResolucaoEntidade>, _categoriasNovas: CategoriaNovaProduto[]) =>
            setEstado((s) => ({ ...s, etapa: "revisao", resolucaoCategoria }))
          }
        />
      )}

      {estado.etapa === "revisao" && (
        <div className="rounded-2xl bg-card shadow-card p-6 text-sm text-muted-foreground">
          {estado.linhasBrutas.length} linha(s), categoria resolvida para {estado.resolucaoCategoria?.size ?? 0} valor(es) — etapa Revisão chega na
          próxima fatia do plano.
        </div>
      )}
    </div>
  );
}
