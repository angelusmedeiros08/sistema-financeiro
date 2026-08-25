"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COLUNAS_TEMPLATE_FIXAS, montarColunasTemplate, sugerirMapeamentoColunas, type ColunaTemplate } from "@/lib/pessoas/importacao/template";
import { reparsearCsvComEncoding, type EncodingSuportado, type ResultadoParse } from "@/lib/importacao/parse";
import { salvarCorrecoesMapeamentoAction } from "@/lib/importacao/regras-mapeamento-actions";
import type { CampoPersonalizadoDefinicao } from "@/lib/pessoas/buscar-pessoa";
import type { ColunaChave } from "@/lib/pessoas/importacao/tipos";

const OPCOES_ENCODING: { valor: EncodingSuportado; rotulo: string }[] = [
  { valor: "utf-8", rotulo: "UTF-8" },
  { valor: "windows-1252", rotulo: "Windows-1252" },
  { valor: "macintosh", rotulo: "Macintosh (Mac Roman)" },
  { valor: "iso-8859-1", rotulo: "ISO-8859-1" },
];

const NENHUMA = "__nenhuma__";

const GRUPOS: { titulo: string; chaves: ColunaChave[] }[] = [
  { titulo: "Pessoa", chaves: ["nome", "perfil", "documento", "natureza", "email", "telefone"] },
  {
    titulo: "Endereço",
    chaves: ["endereco_cep", "endereco_logradouro", "endereco_numero", "endereco_complemento", "endereco_bairro", "endereco_cidade", "endereco_uf"],
  },
  { titulo: "Contato", chaves: ["contato_nome", "contato_cargo", "contato_email", "contato_telefone"] },
];

export function PassoMapeamento({
  parseInicial,
  buffer,
  camposPersonalizados,
  regrasMapeamentoIniciais,
  onVoltar,
  onAvancar,
}: {
  parseInicial: ResultadoParse;
  buffer: ArrayBuffer | null;
  camposPersonalizados: CampoPersonalizadoDefinicao[];
  regrasMapeamentoIniciais: Record<string, string>;
  onVoltar: () => void;
  onAvancar: (dados: { linhasTexto: string[][]; mapeamento: Partial<Record<ColunaChave, number>> }) => void;
}) {
  const colunasTemplate = useMemo(() => montarColunasTemplate(camposPersonalizados), [camposPersonalizados]);
  const [parseAtual, setParseAtual] = useState(parseInicial);
  const [sugestaoAutomatica, setSugestaoAutomatica] = useState(() =>
    sugerirMapeamentoColunas(parseInicial.colunas, colunasTemplate, regrasMapeamentoIniciais),
  );
  const [mapeamento, setMapeamento] = useState<Partial<Record<ColunaChave, number>>>(sugestaoAutomatica);

  function trocarEncoding(encoding: EncodingSuportado) {
    if (!buffer) return;
    const novoParse = reparsearCsvComEncoding(buffer, encoding);
    setParseAtual(novoParse);
    const sugestao = sugerirMapeamentoColunas(novoParse.colunas, colunasTemplate, regrasMapeamentoIniciais);
    setSugestaoAutomatica(sugestao);
    setMapeamento(sugestao);
  }

  const colunasObrigatoriasFaltando = colunasTemplate.filter((c) => c.obrigatoria && mapeamento[c.chave] === undefined);

  // O aviso de encoding acima ("se a prévia sair com acentos errados,
  // troque") prometia uma prévia que nunca existiu nesta tela — o operador
  // só via nome/documento errado bem mais tarde, na Revisão, sem nada
  // apontando de volta pra esse seletor (achado investigando um relato de
  // nome com acento/caractere trocado depois de preencher o modelo).
  function valorPrevia(linha: string[], chave: ColunaChave): string {
    const idx = mapeamento[chave];
    return idx !== undefined ? (linha[idx] ?? "").trim() : "";
  }
  const previaLinhas = parseAtual.linhas.slice(0, 5);

  function renderSelectColuna(c: ColunaTemplate) {
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
                Nem toda célula deste arquivo estava em UTF-8 — os nomes com acento foram corrigidos automaticamente, célula por célula (delimitador{" "}
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

      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo} className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{grupo.titulo}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {COLUNAS_TEMPLATE_FIXAS.filter((c) => grupo.chaves.includes(c.chave)).map(renderSelectColuna)}
          </div>
        </div>
      ))}

      {camposPersonalizados.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Campos personalizados</h3>
          <div className="grid gap-3 sm:grid-cols-2">{colunasTemplate.filter((c) => c.chave.startsWith("campo:")).map(renderSelectColuna)}</div>
        </div>
      )}

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
                  <TableHead>Perfil</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Cidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previaLinhas.map((linha, i) => (
                  <TableRow key={i}>
                    <TableCell>{valorPrevia(linha, "nome") || "—"}</TableCell>
                    <TableCell>{valorPrevia(linha, "perfil") || "—"}</TableCell>
                    <TableCell>{valorPrevia(linha, "documento") || "—"}</TableCell>
                    <TableCell>{valorPrevia(linha, "endereco_cidade") || "—"}</TableCell>
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
          onClick={() => {
            void salvarCorrecoesMapeamentoAction({
              tipoWizard: "pessoas",
              colunasArquivo: parseAtual.colunas,
              sugestaoAutomatica,
              mapeamentoFinal: mapeamento,
            });
            onAvancar({ linhasTexto: parseAtual.linhas, mapeamento });
          }}
        >
          Continuar
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}
