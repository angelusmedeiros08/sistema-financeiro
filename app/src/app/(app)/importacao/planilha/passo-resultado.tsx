"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle, DownloadSimple, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { baixarArquivoTexto } from "@/lib/importacao/download";
import { COLUNAS_TEMPLATE } from "@/lib/importacao/template";
import { importarLinhaAction, revalidarPosImportacaoAction, finalizarImportacaoFinanceiraAction } from "./actions";
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
  const [feitos, setFeitos] = useState(0);
  const [resultados, setResultados] = useState<ResultadoLinha[]>([]);
  const [concluido, setConcluido] = useState(false);
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;

    (async () => {
      const acumulados: ResultadoLinha[] = [];
      for (const item of linhas) {
        const resultado = await importarLinhaAction({
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
          importacaoId: importacaoId ?? undefined,
          linhaNumero: item.linha.linha,
        });

        acumulados.push("erro" in resultado ? { linha: item, sucesso: false, erro: resultado.erro } : { linha: item, sucesso: true });
        setResultados([...acumulados]);
        setFeitos((f) => f + 1);
      }

      if (importacaoId) await finalizarImportacaoFinanceiraAction(importacaoId);
      await revalidarPosImportacaoAction();
      setConcluido(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sucessos = resultados.filter((r) => r.sucesso).length;
  const falhas = resultados.filter((r) => !r.sucesso);
  const percentual = linhas.length > 0 ? Math.round((feitos / linhas.length) * 100) : 100;

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
        <p className="mt-1 text-sm text-muted-foreground">
          {concluido ? "Importação concluída." : `Processando linha ${feitos} de ${linhas.length}...`}
        </p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentual}%` }} />
      </div>

      {concluido && (
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
