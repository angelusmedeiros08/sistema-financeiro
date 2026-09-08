"use client";

import { useState } from "react";
import { CheckCircle, DownloadSimple, FileXls, Spinner, Star, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseArquivo, type ResultadoParse } from "@/lib/importacao/parse";
import { gerarModeloCsv } from "@/lib/importacao/template";
import { baixarArquivoTexto } from "@/lib/importacao/download";

const VANTAGENS_MODELO = [
  "Colunas já com o nome certo — pula direto a etapa de mapeamento",
  "Categoria decide sozinha se é receita ou despesa, sem erro de reconhecimento",
  "Já vem com parcelamento, forma de pagamento, centro de custo e cliente/fornecedor",
];

type ContaFinanceira = { id: string; nome: string };

export function PassoUpload({
  contasFinanceiras,
  onAvancar,
}: {
  contasFinanceiras: ContaFinanceira[];
  onAvancar: (dados: { arquivo: File; buffer: ArrayBuffer; parse: ResultadoParse; contaFinanceiraId: string }) => void;
}) {
  const [contaFinanceiraId, setContaFinanceiraId] = useState(contasFinanceiras[0]?.id ?? "");
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

    onAvancar({ arquivo, buffer: resultado.buffer, parse: resultado.resultado, contaFinanceiraId });
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-card shadow-card p-6">
      <div>
        <h2 className="text-sm font-bold text-foreground">1. Envie sua planilha</h2>
        <p className="mt-1 text-sm text-muted-foreground">Aceita .csv e .xlsx, até 10MB e 500 linhas.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Star size={18} weight="fill" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Use o nosso modelo — é o jeito ideal de importar</p>
            <ul className="mt-1.5 space-y-1">
              {VANTAGENS_MODELO.map((v) => (
                <li key={v} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle size={13} weight="fill" className="mt-0.5 shrink-0 text-primary" />
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 gap-1.5 sm:self-center"
          onClick={() => baixarArquivoTexto("modelo-importacao.csv", gerarModeloCsv())}
        >
          <DownloadSimple size={14} />
          Baixar modelo
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Já tem uma planilha pronta em outro formato? Também funciona — na próxima etapa você diz o que é cada coluna. Nome com acento vindo de fontes
        diferentes na mesma planilha (copiado e colado) é corrigido automaticamente, célula por célula.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="conta_financeira_import">Conta financeira</Label>
        <Select value={contaFinanceiraId} onValueChange={setContaFinanceiraId}>
          <SelectTrigger id="conta_financeira_import" className="w-full max-w-sm">
            <SelectValue placeholder="Selecione a conta..." />
          </SelectTrigger>
          <SelectContent>
            {contasFinanceiras.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Usada nas baixas automáticas de linhas com data de pagamento preenchida.</p>
      </div>

      <label
        className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center hover:bg-muted/40"
        aria-disabled={!contaFinanceiraId}
      >
        <input
          type="file"
          accept=".csv,.xlsx"
          className="sr-only"
          disabled={!contaFinanceiraId || carregando}
          onChange={selecionarArquivo}
        />
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

      {!contaFinanceiraId && <p className="text-sm text-destructive">Selecione a conta financeira antes de enviar o arquivo.</p>}
      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </div>
  );
}
