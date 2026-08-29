"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COLUNAS_TEMPLATE_PRODUTO, sugerirMapeamentoColunasProduto, type ColunaTemplateProduto } from "@/lib/importacao/produtos/template";
import { reparsearCsvComEncoding, type EncodingSuportado, type ResultadoParse } from "@/lib/importacao/parse";
import type { ColunaChaveProduto } from "@/lib/importacao/produtos/tipos";

const OPCOES_ENCODING: { valor: EncodingSuportado; rotulo: string }[] = [
  { valor: "utf-8", rotulo: "UTF-8" },
  { valor: "windows-1252", rotulo: "Windows-1252" },
  { valor: "macintosh", rotulo: "Macintosh (Mac Roman)" },
  { valor: "iso-8859-1", rotulo: "ISO-8859-1" },
];

const NENHUMA = "__nenhuma__";

export function PassoMapeamento({
  parseInicial,
  buffer,
  onVoltar,
  onAvancar,
}: {
  parseInicial: ResultadoParse;
  buffer: ArrayBuffer | null;
  onVoltar: () => void;
  onAvancar: (dados: { linhasTexto: string[][]; mapeamento: Partial<Record<ColunaChaveProduto, number>> }) => void;
}) {
  const [parseAtual, setParseAtual] = useState(parseInicial);
  const [mapeamento, setMapeamento] = useState<Partial<Record<ColunaChaveProduto, number>>>(() =>
    sugerirMapeamentoColunasProduto(parseInicial.colunas),
  );

  function trocarEncoding(encoding: EncodingSuportado) {
    if (!buffer) return;
    const novoParse = reparsearCsvComEncoding(buffer, encoding);
    setParseAtual(novoParse);
    setMapeamento(sugerirMapeamentoColunasProduto(novoParse.colunas));
  }

  const colunasObrigatoriasFaltando = COLUNAS_TEMPLATE_PRODUTO.filter((c) => c.obrigatoria && mapeamento[c.chave] === undefined);

  function valorPrevia(linha: string[], chave: ColunaChaveProduto): string {
    const idx = mapeamento[chave];
    return idx !== undefined ? (linha[idx] ?? "").trim() : "";
  }
  const previaLinhas = parseAtual.linhas.slice(0, 5);

  function renderSelectColuna(c: ColunaTemplateProduto) {
    return (
      <div key={c.chave} className="space-y-1.5">
        <Label htmlFor={`mapa_${c.chave}`}>
          {c.rotulo}
          {c.obrigatoria && <span className="text-destructive"> *</span>}
        </Label>
        <Select
          value={mapeamento[c.chave] !== undefined ? String(mapeamento[c.chave]) : NENHUMA}
          onValueChange={(v) => setMapeamento((atual) => ({ ...atual, [c.chave]: v === NENHUMA ? undefined : Number(v) }))}
        >
          <SelectTrigger id={`mapa_${c.chave}`} className="w-full">
            <SelectValue placeholder="Não usar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NENHUMA}>Não usar</SelectItem>
            {parseAtual.colunas.map((col, i) => (
              <SelectItem key={i} value={String(i)}>
                {col || `Coluna ${i + 1}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {c.ajuda && <p className="text-xs text-muted-foreground">{c.ajuda}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-card shadow-card p-6">
      <div>
        <h2 className="text-sm font-bold text-foreground">2. Confira as colunas</h2>
        <p className="mt-1 text-sm text-muted-foreground">Diga o que é cada coluna do seu arquivo.</p>
      </div>

      {parseAtual.tipoArquivo === "csv" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            {parseAtual.precisouFallbackDeEncoding ? (
              <>
                Nem toda célula deste arquivo estava em UTF-8 — corrigido automaticamente, célula por célula (delimitador{" "}
                <span className="font-medium text-foreground">&quot;{parseAtual.delimitadorUsado}&quot;</span>). Se a prévia ainda sair com acento errado,
                troque o encoding manualmente:
              </>
            ) : (
              <>
                Arquivo em UTF-8, delimitador <span className="font-medium text-foreground">&quot;{parseAtual.delimitadorUsado}&quot;</span>. Se a prévia
                sair com acentos errados, troque o encoding:
              </>
            )}
          </p>
          <Select value={parseAtual.encodingUsado} onValueChange={(v) => trocarEncoding(v as EncodingSuportado)}>
            <SelectTrigger className="h-7 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPCOES_ENCODING.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {parseAtual.tipoArquivo === "xlsx" && (parseAtual.totalAbas ?? 1) > 1 && (
        <p className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          O arquivo tem {parseAtual.totalAbas} abas — lendo só <span className="font-medium text-foreground">&quot;{parseAtual.nomeAbaUsada}&quot;</span> (a
          primeira).
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">{COLUNAS_TEMPLATE_PRODUTO.map(renderSelectColuna)}</div>

      {colunasObrigatoriasFaltando.length > 0 && (
        <p className="text-sm text-destructive">Falta mapear: {colunasObrigatoriasFaltando.map((c) => c.rotulo).join(", ")}.</p>
      )}

      {previaLinhas.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Prévia (5 primeiras linhas)</h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Categoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previaLinhas.map((linha, i) => (
                  <TableRow key={i}>
                    <TableCell>{valorPrevia(linha, "nome") || "—"}</TableCell>
                    <TableCell>{valorPrevia(linha, "tipo") || "—"}</TableCell>
                    <TableCell>{valorPrevia(linha, "preco_venda") || "—"}</TableCell>
                    <TableCell>{valorPrevia(linha, "categoria") || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" className="gap-1.5" onClick={onVoltar}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
        <Button
          type="button"
          className="gap-1.5"
          disabled={colunasObrigatoriasFaltando.length > 0}
          onClick={() => onAvancar({ linhasTexto: parseAtual.linhas, mapeamento })}
        >
          Continuar
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}
