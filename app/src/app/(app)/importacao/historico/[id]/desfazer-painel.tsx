"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner, Trash, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { preverDesfazerImportacaoAction, desfazerImportacaoAction } from "../actions";
import { formatarMoeda } from "@/lib/formatacao";
import type { PreviaDesfazerImportacaoPessoas, ResultadoDesfazerImportacaoPessoas } from "@/lib/importacoes/importacoes";

// Fluxo em 2 passos igual ao desfazer financeiro: lançamento vinculado à
// pessoa agora é revertido junto (não fica mais "protegido" em silêncio),
// então nada muda no banco até a prévia (só leitura) ser mostrada e o
// usuário confirmar explicitamente em cima dela.
export function DesfazerPainel({ importacaoId, contagemAtiva }: { importacaoId: string; contagemAtiva: number }) {
  const router = useRouter();
  const [previa, setPrevia] = useState<PreviaDesfazerImportacaoPessoas | null>(null);
  const [carregandoPrevia, setCarregandoPrevia] = useState(false);
  const [rodando, setRodando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDesfazerImportacaoPessoas | null>(null);
  const [erro, setErro] = useState("");
  const painelPreviaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previa) painelPreviaRef.current?.focus();
  }, [previa]);

  async function abrirPrevia() {
    setErro("");
    setCarregandoPrevia(true);
    const resposta = await preverDesfazerImportacaoAction(importacaoId);
    setCarregandoPrevia(false);
    if ("erro" in resposta) {
      setErro(resposta.erro);
      return;
    }
    setPrevia(resposta);
  }

  async function confirmar() {
    if (!previa) return;
    setErro("");
    setRodando(true);
    let resposta: ResultadoDesfazerImportacaoPessoas | { erro: string };
    try {
      resposta = await desfazerImportacaoAction(importacaoId, previa);
    } catch {
      resposta = { erro: "Falha inesperada ao desfazer a importação. Tente de novo." };
    }
    setRodando(false);
    setPrevia(null);

    if ("erro" in resposta) {
      setErro(resposta.erro);
      return;
    }
    setResultado(resposta);
    router.refresh();
  }

  if (previa) {
    const valorTotalEventos = previa.eventosAReverter.reduce((acc, e) => acc + e.valor, 0);
    return (
      <div
        ref={painelPreviaRef}
        tabIndex={-1}
        className="flex max-w-md flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 outline-none"
      >
        <div className="flex gap-2">
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-destructive" />
          <div className="space-y-1.5 text-xs text-foreground">
            <p className="font-medium">
              Serão removidas: {previa.pessoasARemover.length} pessoa{previa.pessoasARemover.length !== 1 ? "s" : ""}.
            </p>
            {previa.eventosAReverter.length > 0 && (
              <p>
                Destas, {new Set(previa.eventosAReverter.map((e) => e.pessoa_id)).size} têm lançamento vinculado — {previa.eventosAReverter.length}{" "}
                lançamento(s), {formatarMoeda(valorTotalEventos)}, serão revertidos junto (baixa incluída, se houver).
              </p>
            )}
            {previa.protegidas.length > 0 && (
              <>
                <p>{previa.protegidas.length} continuam protegidas:</p>
                <ul className="list-disc pl-4">
                  {previa.protegidas.map((p) => (
                    <li key={p.pessoa_id}>
                      {p.nome} — {p.motivo}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {previa.pessoasARemover.length === 0 && <p>Nenhuma pessoa pode ser removida automaticamente — todas precisam de atenção manual.</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="destructive" disabled={rodando || previa.pessoasARemover.length === 0} onClick={confirmar}>
            {rodando ? "Desfazendo..." : "Confirmar exclusão"}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={rodando} onClick={() => setPrevia(null)}>
            Cancelar
          </Button>
        </div>
        {rodando && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Spinner size={12} className="shrink-0 animate-spin" />
            Isso pode levar alguns segundos. Não feche nem saia desta página até terminar.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {contagemAtiva > 0 && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-destructive" disabled={carregandoPrevia} onClick={abrirPrevia}>
          <Trash size={14} />
          {carregandoPrevia ? "Avaliando..." : "Desfazer importação"}
        </Button>
      )}
      {erro && (
        <p role="alert" className="text-xs text-destructive">
          {erro}
        </p>
      )}
      {resultado && (
        <div role="status" className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            {resultado.removidas} pessoa{resultado.removidas !== 1 ? "s" : ""} removida{resultado.removidas !== 1 ? "s" : ""},{" "}
            {resultado.eventosRevertidos} lançamento(s) revertido(s).
          </p>
          {resultado.eventosComErro.length > 0 && (
            <p role="alert" className="mt-1 text-destructive">
              {resultado.eventosComErro.length} lançamento(s) falharam ao reverter — veja os detalhes no lançamento.
            </p>
          )}
          {resultado.protegidas.length > 0 && (
            <>
              <p className="mt-1.5">{resultado.protegidas.length} continuam protegidas:</p>
              <ul className="mt-1 list-disc pl-4">
                {resultado.protegidas.map((p) => (
                  <li key={p.pessoa_id}>
                    {p.nome} — {p.motivo}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
