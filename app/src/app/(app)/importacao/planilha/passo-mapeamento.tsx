"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COLUNAS_TEMPLATE, sugerirMapeamentoColunas } from "@/lib/importacao/template";
import { reparsearCsvComEncoding, type EncodingSuportado, type ResultadoParse } from "@/lib/importacao/parse";
import { parseDataPlanilha, parseValorPlanilha, type FormatoNumerico } from "@/lib/importacao/locale-br";
import { montarLinhasBrutas } from "@/lib/importacao/validacao";
import type { ColunaChave, LinhaBruta } from "@/lib/importacao/tipos";
import { cn } from "@/lib/utils";

const OPCOES_ENCODING: { valor: EncodingSuportado; rotulo: string }[] = [
  { valor: "utf-8", rotulo: "UTF-8" },
  { valor: "windows-1252", rotulo: "Windows-1252" },
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
  onAvancar: (dados: { linhasBrutas: LinhaBruta[]; formatoNumerico: FormatoNumerico }) => void;
}) {
  const [parseAtual, setParseAtual] = useState(parseInicial);
  const [mapeamento, setMapeamento] = useState<Partial<Record<ColunaChave, number>>>(() => sugerirMapeamentoColunas(parseInicial.colunas));
  const [formatoNumerico, setFormatoNumerico] = useState<FormatoNumerico>("BR");

  function trocarEncoding(encoding: EncodingSuportado) {
    if (!buffer) return;
    const novoParse = reparsearCsvComEncoding(buffer, encoding);
    setParseAtual(novoParse);
    setMapeamento(sugerirMapeamentoColunas(novoParse.colunas));
  }

  const colunasObrigatoriasFaltando = COLUNAS_TEMPLATE.filter((c) => c.obrigatoria && mapeamento[c.chave] === undefined);

  const previaLinhas = useMemo(() => montarLinhasBrutas(parseAtual.linhas.slice(0, 5), mapeamento), [parseAtual, mapeamento]);

  function avancar() {
    const linhasBrutas = montarLinhasBrutas(parseAtual.linhas, mapeamento);
    onAvancar({ linhasBrutas, formatoNumerico });
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-card shadow-card p-6">
      <div>
        <h2 className="text-sm font-bold text-foreground">2. Confira as colunas e o formato</h2>
        <p className="mt-1 text-sm text-muted-foreground">Diga o que é cada coluna do seu arquivo e confirme como interpretar valor e data.</p>
      </div>

      {parseAtual.tipoArquivo === "csv" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            Detectamos <span className="font-medium text-foreground">{OPCOES_ENCODING.find((o) => o.valor === parseAtual.encodingUsado)?.rotulo}</span> com
            delimitador <span className="font-medium text-foreground">&quot;{parseAtual.delimitadorUsado}&quot;</span>. Se a prévia abaixo sair com
            acentos errados, troque o encoding:
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
          primeira). Se os dados estiverem em outra aba, mova pra primeira posição e reenvie.
        </p>
      )}

      <div className="space-y-1.5">
        <Label>Formato de número e data</Label>
        <RadioGroup value={formatoNumerico} onValueChange={(v) => setFormatoNumerico(v as FormatoNumerico)} className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="BR" /> Brasileiro (1.234,56 e DD/MM/AAAA)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="US" /> Americano (1,234.56 e MM/DD/AAAA)
          </label>
        </RadioGroup>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {COLUNAS_TEMPLATE.map((c) => (
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
        ))}
      </div>

      {colunasObrigatoriasFaltando.length > 0 && (
        <p className="text-sm text-destructive">
          Falta mapear: {colunasObrigatoriasFaltando.map((c) => c.rotulo).join(", ")}.
        </p>
      )}

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Prévia (5 primeiras linhas)</h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Competência</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previaLinhas.map((linha) => {
                const dataOk = !linha.dataCompetencia || parseDataPlanilha(linha.dataCompetencia, formatoNumerico) !== null;
                const valorOk = !linha.valor || parseValorPlanilha(linha.valor, formatoNumerico) !== null;
                return (
                  <TableRow key={linha.linha}>
                    <TableCell className={cn(!dataOk && "text-destructive")}>{linha.dataCompetencia || "—"}</TableCell>
                    <TableCell className={cn(!valorOk && "text-destructive")}>
                      {linha.valor ? parseValorPlanilha(linha.valor, formatoNumerico)?.toString() ?? `inválido: ${linha.valor}` : "—"}
                    </TableCell>
                    <TableCell>{linha.categoria || "—"}</TableCell>
                    <TableCell className="max-w-48 truncate">{linha.descricao || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="ghost" className="gap-1.5" onClick={onVoltar}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
        <Button type="button" className="gap-1.5" disabled={colunasObrigatoriasFaltando.length > 0} onClick={avancar}>
          Continuar
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}
