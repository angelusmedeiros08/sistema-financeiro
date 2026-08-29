"use client";

import { useState } from "react";
import { Image as ImageIcon, Spinner, TextAa, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { extrairLancamentosIAAction } from "./actions";
import type { LinhaBrutaIA } from "@/lib/importacao/tipos";

type ContaFinanceira = { id: string; nome: string };
type Modo = "texto" | "imagem";

// Normaliza qualquer imagem aceita pelo navegador (incluindo HEIC de iPhone,
// quando o navegador consegue decodificar) pra JPEG antes do envio — a API
// só aceita jpeg/png/webp. Se o navegador não conseguir nem decodificar
// (formato realmente não suportado), devolve erro explícito em vez de
// mandar bytes que a API vai rejeitar sem explicação nenhuma pro usuário.
async function converterParaJpegBase64(arquivo: File): Promise<{ base64: string } | { erro: string }> {
  try {
    const bitmap = await createImageBitmap(arquivo);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { erro: "Não foi possível processar essa imagem neste navegador." };
    ctx.drawImage(bitmap, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    return { base64: dataUrl.split(",")[1] };
  } catch {
    return { erro: "Não conseguimos ler essa imagem. Tente outro arquivo ou um print em vez de foto direta." };
  }
}

export function PassoEntradaIA({
  contasFinanceiras,
  onAvancar,
}: {
  contasFinanceiras: ContaFinanceira[];
  onAvancar: (dados: { linhasIA: LinhaBrutaIA[]; contaFinanceiraId: string; nomeArquivo: string }) => void;
}) {
  const [contaFinanceiraId, setContaFinanceiraId] = useState(contasFinanceiras[0]?.id ?? "");
  const [modo, setModo] = useState<Modo>("texto");
  const [texto, setTexto] = useState("");
  const [imagemArquivo, setImagemArquivo] = useState<File | null>(null);
  const [imagemPreviewUrl, setImagemPreviewUrl] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  function selecionarImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro("");
    setImagemArquivo(arquivo);
    setImagemPreviewUrl(URL.createObjectURL(arquivo));
  }

  const pronto = contaFinanceiraId && (modo === "texto" ? texto.trim().length > 0 : imagemArquivo !== null);

  async function extrair() {
    if (!pronto) return;
    setErro("");
    setCarregando(true);

    const entrada =
      modo === "texto"
        ? ({ texto } as const)
        : await (async () => {
            const convertido = await converterParaJpegBase64(imagemArquivo!);
            if ("erro" in convertido) return convertido;
            return { imagemBase64: convertido.base64, imagemMediaType: "image/jpeg" as const };
          })();

    if ("erro" in entrada) {
      setCarregando(false);
      setErro(entrada.erro);
      return;
    }

    const resultado = await extrairLancamentosIAAction(entrada);
    setCarregando(false);

    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }

    onAvancar({ linhasIA: resultado.linhas, contaFinanceiraId, nomeArquivo: "Importação com IA" });
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-card shadow-card p-6">
      <div>
        <h2 className="text-sm font-bold text-foreground">1. Cole um texto ou envie uma imagem</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A IA identifica os lançamentos e você confere cada um antes de importar — nada é salvo sem sua aprovação.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="conta_financeira_ia">Conta financeira</Label>
        <Select value={contaFinanceiraId} onValueChange={setContaFinanceiraId}>
          <SelectTrigger id="conta_financeira_ia" className="w-full max-w-sm">
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

      <div className="flex w-fit items-center gap-0.5 rounded-full bg-muted/60 p-1">
        <button
          type="button"
          onClick={() => setModo("texto")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            modo === "texto" ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <TextAa size={14} />
          Colar texto
        </button>
        <button
          type="button"
          onClick={() => setModo("imagem")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            modo === "imagem" ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ImageIcon size={14} />
          Enviar imagem
        </button>
      </div>

      {modo === "texto" ? (
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={"Ex.: Paguei 45 reais de Uber ontem, recebi 1200 de honorários do cliente Silva dia 20 via Pix..."}
          className="min-h-32"
        />
      ) : (
        <label
          className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center hover:bg-muted/40"
        >
          <input type="file" accept="image/*" className="sr-only" onChange={selecionarImagem} />
          {imagemPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview local (object URL), não é asset otimizável pelo next/image
            <img src={imagemPreviewUrl} alt="Prévia da imagem selecionada" className="max-h-48 rounded-lg object-contain" />
          ) : (
            <>
              <UploadSimple size={22} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Clique para escolher uma imagem</span>
              <span className="text-xs text-muted-foreground">Recibo, comprovante, print de fatura ou extrato</span>
            </>
          )}
        </label>
      )}

      {!contaFinanceiraId && <p className="text-sm text-destructive">Selecione a conta financeira antes de continuar.</p>}
      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="flex justify-end">
        <Button type="button" disabled={!pronto || carregando} onClick={extrair} className="gap-1.5">
          {carregando && <Spinner size={14} className="animate-spin" />}
          {carregando ? "Extraindo..." : "Extrair lançamentos"}
        </Button>
      </div>
    </div>
  );
}
