"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle, DownloadSimple, Spinner, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { baixarArquivoTexto } from "@/lib/importacao/download";
import { COLUNAS_TEMPLATE } from "@/lib/importacao/template";
import { executarImportacaoFinanceiraAction, revalidarPosImportacaoAction } from "./actions";
import type { LinhaPronta } from "./passo-preview";

type ResultadoLinha = { linha: LinhaPronta; sucesso: boolean; erro?: string };

export function PassoResultado({
  linhas,
  totalLinhasArquivo,
  contaFinanceiraId,
  importacaoId,
  onReiniciar,
}: {
  linhas: LinhaPronta[];
  totalLinhasArquivo: number;
  contaFinanceiraId: string;
  importacaoId: string | null;
  onReiniciar: () => void;
}) {
  const [resultados, setResultados] = useState<ResultadoLinha[]>([]);
  const [concluido, setConcluido] = useState(false);
  const [erroGeral, setErroGeral] = useState("");
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;

    (async () => {
      const resposta = await executarImportacaoFinanceiraAction(
        importacaoId,
        linhas.map((item) => ({
          conta_financeira_id: contaFinanceiraId,
          import_key: item.linha.importKey,
          descricao: item.linha.descricao,
          valor_total: item.linha.valorNumero as number,
          data_competencia: item.linha.dataCompetenciaIso as string,
          data_vencimento: item.linha.dataVencimentoIso ?? (item.linha.dataCompetenciaIso as string),
          data_pagamento: item.linha.dataPagamentoIso,
          tipo: item.tipo,
          categoria_id: item.categoriaId,
          pessoa_id: item.pessoaId,
          centro_custo_id: item.centroCustoId,
          forma_pagamento_id: item.formaPagamentoId,
          linhaNumero: item.linha.linha,
        })),
      );

      if ("erro" in resposta) {
        setErroGeral(resposta.erro);
      } else {
        setResultados(
          linhas.map((item, i) => {
            const r = resposta.resultados[i];
            return r.sucesso ? { linha: item, sucesso: true } : { linha: item, sucesso: false, erro: r.erro };
          }),
        );
        await revalidarPosImportacaoAction();
      }
      setConcluido(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sucessos = resultados.filter((r) => r.sucesso).length;
  const falhas = resultados.filter((r) => !r.sucesso);

  function baixarErros() {
    const cabecalho = COLUNAS_TEMPLATE.map((c) => c.rotulo).join(";") + ";Motivo do erro";
    const linhasCsv = falhas.map((f) => {
      const l = f.linha.linha;
      return [
        l.dataCompetencia,
        l.valor,
        l.categoria,
        l.descricao,
        l.dataVencimento,
        l.dataPagamento,
        l.pessoa,
        l.documentoPessoa,
        l.centroCusto,
        l.formaPagamento,
        f.erro ?? "",
      ].join(";");
    });
    baixarArquivoTexto("linhas-com-erro.csv", [cabecalho, ...linhasCsv].join("\n") + "\n");
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-card shadow-card p-6">
      <div>
        <h2 className="text-sm font-bold text-foreground">5. Importando</h2>
        <p className="mt-1 text-sm text-muted-foreground">{concluido ? "Importação concluída." : "Processando as linhas."}</p>
      </div>

      {!concluido && (
        <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
          <Spinner size={20} className="shrink-0 animate-spin text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Importando {linhas.length} lançamento{linhas.length === 1 ? "" : "s"}...
            </p>
            <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos. Não feche nem saia desta página até terminar.</p>
          </div>
        </div>
      )}

      {erroGeral && <p className="text-sm text-destructive">Falha ao importar: {erroGeral}</p>}

      {concluido && !erroGeral && (
        <>
          <p className="text-xs text-muted-foreground">
            {totalLinhasArquivo} linhas na planilha → {linhas.length} chegaram prontas na importação → {sucessos} importadas
            {falhas.length > 0 && `, ${falhas.length} falharam`}
            {totalLinhasArquivo - linhas.length > 0 && ` (${totalLinhasArquivo - linhas.length} ficaram para trás nas etapas de Colunas/Cadastros/Revisão)`}.
          </p>
          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-1.5 text-sm font-medium text-positivo-foreground">
              <CheckCircle size={16} weight="fill" />
              {sucessos} importados com sucesso
            </span>
            {falhas.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                <XCircle size={16} weight="fill" />
                {falhas.length} falharam
              </span>
            )}
          </div>

          {falhas.length > 0 && (
            <div className="space-y-2">
              <ul className="max-h-40 space-y-1 overflow-auto rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                {falhas.map((f, i) => (
                  <li key={i}>
                    Linha {f.linha.linha.linha}: {f.erro}
                  </li>
                ))}
              </ul>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={baixarErros}>
                <DownloadSimple size={14} />
                Baixar linhas com erro
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onReiniciar}>
              Importar outro arquivo
            </Button>
            <Button type="button" asChild>
              <Link href="/despesas">Ver lançamentos</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
