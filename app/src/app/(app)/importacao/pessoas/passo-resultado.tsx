"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle, DownloadSimple, Spinner, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { baixarArquivoTexto, linhaCsvSegura } from "@/lib/importacao/download";
import { COLUNAS_TEMPLATE_FIXAS } from "@/lib/pessoas/importacao/template";
import { executarImportacaoPessoasAction, revalidarPosImportacaoPessoasAction } from "./actions";
import type { LinhaPronta } from "./passo-revisao";

type ResultadoLinha = { linha: LinhaPronta; sucesso: boolean; erro?: string };
type Fase = "executando" | "concluido" | "erro-fatal";

export function PassoResultado({ linhas, nomeArquivo, onReiniciar }: { linhas: LinhaPronta[]; nomeArquivo: string; onReiniciar: () => void }) {
  const [resultados, setResultados] = useState<ResultadoLinha[]>([]);
  const [fase, setFase] = useState<Fase>("executando");
  const [erroFatal, setErroFatal] = useState("");
  const [importacaoId, setImportacaoId] = useState<string | null>(null);
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;

    (async () => {
      // try/catch em volta da chamada inteira — sem isso, uma falha de
      // rede/timeout na Server Action (exceção de verdade, não um
      // `{erro}` de retorno) deixava a tela presa em "executando" pra
      // sempre, sem nenhum sinal pro usuário (achado em revisão de
      // código — Retomar/Desfazer já tratavam isso, este fluxo não).
      try {
        const resposta = await executarImportacaoPessoasAction(
          nomeArquivo || "importação sem nome",
          linhas.map((l) => ({ ...l, linhaNumero: l.linhaNumero })),
        );

        if ("erro" in resposta) {
          setErroFatal(resposta.erro);
          setFase("erro-fatal");
          return;
        }

        setImportacaoId(resposta.importacaoId);
        setResultados(
          linhas.map((item, i) => {
            const r = resposta.resultados[i];
            return r.sucesso ? { linha: item, sucesso: true } : { linha: item, sucesso: false, erro: r.erro };
          }),
        );
        await revalidarPosImportacaoPessoasAction();
        setFase("concluido");
      } catch {
        setErroFatal("Falha inesperada ao importar. Veja o Histórico de importações para conferir o que já foi processado.");
        setFase("erro-fatal");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sucessos = resultados.filter((r) => r.sucesso).length;
  const falhas = resultados.filter((r) => !r.sucesso);
  const terminou = fase === "concluido";

  // Reconstrói a linha a partir dos campos já normalizados (não guardamos o
  // texto bruto original) — suficiente pra reenviar depois de corrigir, já
  // que os valores aqui são os que de fato seriam gravados.
  function baixarErros() {
    const cabecalho = linhaCsvSegura([...COLUNAS_TEMPLATE_FIXAS.map((c) => c.rotulo), "Motivo do erro"]);
    const linhasCsv = falhas.map((f) => {
      const l = f.linha;
      return linhaCsvSegura([
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
      ]);
    });
    baixarArquivoTexto("linhas-com-erro.csv", [cabecalho, ...linhasCsv].join("\n") + "\n");
  }

  if (fase === "erro-fatal") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-card shadow-card p-6">
        <p className="text-sm text-destructive">Não foi possível iniciar a importação: {erroFatal}</p>
        <Button type="button" variant="outline" onClick={onReiniciar}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-card shadow-card p-6">
      <div>
        <h2 className="text-sm font-bold text-foreground">4. Importando</h2>
        <p className="mt-1 text-sm text-muted-foreground">{terminou ? "Importação concluída." : "Processando as linhas."}</p>
      </div>

      {!terminou && (
        <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
          <Spinner size={20} className="shrink-0 animate-spin text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Importando {linhas.length} pessoa{linhas.length === 1 ? "" : "s"}...
            </p>
            <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos. Não feche nem saia desta página até terminar.</p>
          </div>
        </div>
      )}

      {terminou && (
        <>
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
