"use client";

import { useState } from "react";
import { DownloadSimple, FileXls, Spinner, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { parseArquivo, type ResultadoParse } from "@/lib/importacao/parse";
import { gerarModeloCsv } from "@/lib/pessoas/importacao/template";
import { baixarArquivoTexto } from "@/lib/importacao/download";
import type { CampoPersonalizadoDefinicao } from "@/lib/pessoas/buscar-pessoa";

export function PassoUpload({
  camposPersonalizados,
  onAvancar,
}: {
  camposPersonalizados: CampoPersonalizadoDefinicao[];
  onAvancar: (dados: { arquivo: File; buffer: ArrayBuffer; parse: ResultadoParse }) => void;
}) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [arquivoNome, setArquivoNome] = useState("");

  async function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    setErro("");
    setArquivoNome(arquivo.name);
    setCarregando(true);
    const resultado = await parseArquivo(arquivo);
    setCarregando(false);

    if ("erro" in resultado) {
      setErro(resultado.erro);
      setArquivoNome("");
      return;
    }

    onAvancar({ arquivo, buffer: resultado.buffer, parse: resultado.resultado });
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-card shadow-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">1. Envie sua planilha</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aceita .csv e .xlsx, até 10MB e 500 linhas. Baixe o modelo se quiser garantir que as colunas batem certinho.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => baixarArquivoTexto("modelo-clientes-fornecedores.csv", gerarModeloCsv(camposPersonalizados))}
        >
          <DownloadSimple size={14} />
          Baixar modelo
        </Button>
      </div>

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center hover:bg-muted/40">
        <input type="file" accept=".csv,.xlsx" className="sr-only" disabled={carregando} onChange={selecionarArquivo} />
        {carregando ? (
          <>
            <Spinner size={22} className="animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Lendo {arquivoNome}...</span>
          </>
        ) : (
          <>
            {arquivoNome ? <FileXls size={22} className="text-muted-foreground" /> : <UploadSimple size={22} className="text-muted-foreground" />}
            <span className="text-sm font-medium text-foreground">Clique para escolher o arquivo</span>
            <span className="text-xs text-muted-foreground">.csv ou .xlsx</span>
          </>
        )}
      </label>

      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </div>
  );
}
