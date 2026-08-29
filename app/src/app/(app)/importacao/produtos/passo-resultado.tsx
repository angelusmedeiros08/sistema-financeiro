"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle, Spinner, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { executarImportacaoProdutosAction, revalidarPosImportacaoProdutosAction } from "./actions";
import type { LinhaPronta } from "./passo-revisao";

type ResultadoLinha = { linha: LinhaPronta; sucesso: boolean; erro?: string };
type Fase = "executando" | "concluido" | "erro-fatal";

export function PassoResultado({ linhas, nomeArquivo, onReiniciar }: { linhas: LinhaPronta[]; nomeArquivo: string; onReiniciar: () => void }) {
  const [resultados, setResultados] = useState<ResultadoLinha[]>([]);
  const [fase, setFase] = useState<Fase>("executando");
  const [erroFatal, setErroFatal] = useState("");
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;

    (async () => {
      // try/catch em volta da chamada inteira — mesmo achado já corrigido
      // nos outros 2 fluxos: sem isso, uma falha de rede de verdade (não um
      // {erro} de retorno) deixava a tela presa em "executando" pra sempre.
      try {
        const resposta = await executarImportacaoProdutosAction(nomeArquivo || "importação sem nome", linhas);

        if ("erro" in resposta) {
          setErroFatal(resposta.erro);
          setFase("erro-fatal");
          return;
        }

        setResultados(
          linhas.map((item, i) => {
            const r = resposta.resultados[i];
            return r.sucesso ? { linha: item, sucesso: true } : { linha: item, sucesso: false, erro: r.erro };
          }),
        );
        await revalidarPosImportacaoProdutosAction();
        setFase("concluido");
      } catch {
        setErroFatal("Falha inesperada ao importar.");
        setFase("erro-fatal");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sucessos = resultados.filter((r) => r.sucesso).length;
  const falhas = resultados.filter((r) => !r.sucesso);
  const terminou = fase === "concluido";

  if (fase === "erro-fatal") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-card shadow-card p-6">
        <p className="text-sm text-destructive">Não foi possível concluir a importação: {erroFatal}</p>
        <Button type="button" variant="outline" onClick={onReiniciar}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-card shadow-card p-6">
      <div>
        <h2 className="text-sm font-bold text-foreground">5. Importando</h2>
        <p className="mt-1 text-sm text-muted-foreground">{terminou ? "Importação concluída." : "Processando as linhas."}</p>
      </div>

      {!terminou && (
        <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
          <Spinner size={20} className="shrink-0 animate-spin text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Importando {linhas.length} {linhas.length === 1 ? "item" : "itens"}...
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
            <ul className="max-h-40 space-y-1 overflow-auto rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
              {falhas.map((f, i) => (
                <li key={i}>
                  Linha {f.linha.linhaNumero} ({f.linha.nome}): {f.erro}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={onReiniciar}>
              Importar outro arquivo
            </Button>
            <Button type="button" asChild>
              <Link href="/produtos-servicos">Ver produtos e serviços</Link>
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/importacao/historico">Central de Importações</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
