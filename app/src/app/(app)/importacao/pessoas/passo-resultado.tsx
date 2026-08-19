"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle, DownloadSimple, StopCircle, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { baixarArquivoTexto } from "@/lib/importacao/download";
import { COLUNAS_TEMPLATE_FIXAS } from "@/lib/pessoas/importacao/template";
import { iniciarImportacaoPessoasAction, importarLinhaPessoaAction, finalizarImportacaoPessoasAction, revalidarPosImportacaoPessoasAction } from "./actions";
import type { LinhaPronta } from "./passo-revisao";

type ResultadoLinha = { linha: LinhaPronta; sucesso: boolean; erro?: string };
type Fase = "iniciando" | "executando" | "concluido" | "cancelado" | "erro-fatal";

export function PassoResultado({ linhas, nomeArquivo, onReiniciar }: { linhas: LinhaPronta[]; nomeArquivo: string; onReiniciar: () => void }) {
  const [feitos, setFeitos] = useState(0);
  const [resultados, setResultados] = useState<ResultadoLinha[]>([]);
  const [fase, setFase] = useState<Fase>("iniciando");
  const [erroFatal, setErroFatal] = useState("");
  const [importacaoId, setImportacaoId] = useState<string | null>(null);
  const canceladoRef = useRef(false);
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;

    (async () => {
      const inicio = await iniciarImportacaoPessoasAction(
        nomeArquivo || "importação sem nome",
        linhas.map((l) => ({ ...l, linhaNumero: l.linhaNumero })),
      );

      if ("erro" in inicio) {
        setErroFatal(inicio.erro);
        setFase("erro-fatal");
        return;
      }

      setImportacaoId(inicio.importacao_id);
      setFase("executando");

      const acumulados: ResultadoLinha[] = [];
      let foiCancelado = false;
      for (const item of linhas) {
        if (canceladoRef.current) {
          foiCancelado = true;
          break;
        }

        const itemId = inicio.itensPorLinha[item.linhaNumero];
        const resultado = await importarLinhaPessoaAction(itemId, {
          acao: item.acao,
          pessoaIdExistente: item.pessoaIdExistente,
          permitirAtualizarNome: item.permitirAtualizarNome,
          nome: item.nome,
          documento: item.documento,
          natureza: item.natureza,
          email: item.email,
          telefone: item.telefone,
          perfisNovos: item.perfisNovos,
          campos_personalizados: item.campos_personalizados,
          endereco: item.endereco,
          contato: item.contato,
        });
        acumulados.push("erro" in resultado ? { linha: item, sucesso: false, erro: resultado.erro } : { linha: item, sucesso: true });
        setResultados([...acumulados]);
        setFeitos((f) => f + 1);
      }

      await finalizarImportacaoPessoasAction(inicio.importacao_id, foiCancelado ? "cancelada" : "concluida");
      await revalidarPosImportacaoPessoasAction();
      setFase(foiCancelado ? "cancelado" : "concluido");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cancelar() {
    canceladoRef.current = true;
  }

  const sucessos = resultados.filter((r) => r.sucesso).length;
  const falhas = resultados.filter((r) => !r.sucesso);
  const percentual = linhas.length > 0 ? Math.round((feitos / linhas.length) * 100) : 100;
  const terminou = fase === "concluido" || fase === "cancelado";

  // Reconstrói a linha a partir dos campos já normalizados (não guardamos o
  // texto bruto original) — suficiente pra reenviar depois de corrigir, já
  // que os valores aqui são os que de fato seriam gravados.
  function baixarErros() {
    const cabecalho = COLUNAS_TEMPLATE_FIXAS.map((c) => c.rotulo).join(";") + ";Motivo do erro";
    const linhasCsv = falhas.map((f) => {
      const l = f.linha;
      return [
        l.nome,
        l.perfisNovos.join(","),
        l.documento ?? "",
        l.natureza === "FISICA" ? "Física" : l.natureza === "JURIDICA" ? "Jurídica" : "",
        l.email ?? "",
        l.telefone ?? "",
        l.endereco?.cep ?? "",
        l.endereco?.logradouro ?? "",
        l.endereco?.numero ?? "",
        l.endereco?.complemento ?? "",
        l.endereco?.bairro ?? "",
        l.endereco?.cidade ?? "",
        l.endereco?.uf ?? "",
        l.contato?.nome ?? "",
        l.contato?.cargo ?? "",
        l.contato?.email ?? "",
        l.contato?.telefone ?? "",
        f.erro ?? "",
      ].join(";");
    });
    baixarArquivoTexto("linhas-com-erro.csv", [cabecalho, ...linhasCsv].join("\n") + "\n");
  }

  if (fase === "erro-fatal") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-destructive">Não foi possível iniciar a importação: {erroFatal}</p>
        <Button type="button" variant="outline" onClick={onReiniciar}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">4. Importando</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {fase === "cancelado"
              ? "Importação cancelada — as linhas já processadas foram mantidas."
              : terminou
                ? "Importação concluída."
                : `Processando linha ${feitos} de ${linhas.length}...`}
          </p>
        </div>
        {fase === "executando" && (
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 text-destructive" onClick={cancelar}>
            <StopCircle size={14} />
            Cancelar
          </Button>
        )}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentual}%` }} />
      </div>

      {terminou && (
        <>
          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-1.5 text-sm font-medium text-[#0F5F50]">
              <CheckCircle size={16} weight="fill" />
              {sucessos} importados com sucesso
            </span>
            {falhas.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                <XCircle size={16} weight="fill" />
                {falhas.length} falharam
              </span>
            )}
            {fase === "cancelado" && (
              <span className="text-sm font-medium text-muted-foreground">{linhas.length - feitos} não processadas</span>
            )}
          </div>

          {falhas.length > 0 && (
            <div className="space-y-2">
              <ul className="max-h-40 space-y-1 overflow-auto rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                {falhas.map((f, i) => (
                  <li key={i}>
                    Linha {f.linha.linhaNumero} ({f.linha.nomeExibicao}): {f.erro}
                  </li>
                ))}
              </ul>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={baixarErros}>
                <DownloadSimple size={14} />
                Baixar linhas com erro
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={onReiniciar}>
              Importar outro arquivo
            </Button>
            <Button type="button" asChild>
              <Link href="/clientes">Ver clientes</Link>
            </Button>
            {importacaoId && (
              <Button type="button" variant="ghost" asChild>
                <Link href={`/importacao/historico/${importacaoId}`}>Ver detalhes desta importação</Link>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
