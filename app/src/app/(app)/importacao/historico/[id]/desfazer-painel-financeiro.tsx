"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IndicadorProcessando } from "@/components/ui/indicador-processando";
import { preverDesfazerImportacaoFinanceiraAction, desfazerImportacaoFinanceiraAction } from "../actions";
import type { PreviaDesfazerFinanceira, ResultadoDesfazerFinanceira } from "@/lib/importacoes/importacoes-financeiro";

// Fluxo em 2 passos de propósito: nada muda no banco até a prévia (só
// leitura) ser mostrada e o usuário confirmar explicitamente em cima
// dela — nunca um "desfazer" de 1 clique só, dado que reverte lançamento
// financeiro de verdade (Seção "Fluxo de desfazer" da spec).
export function DesfazerPainelFinanceiro({ importacaoId }: { importacaoId: string }) {
  const router = useRouter();
  const [previa, setPrevia] = useState<PreviaDesfazerFinanceira | null>(null);
  const [incluirModificados, setIncluirModificados] = useState(false);
  const [carregandoPrevia, setCarregandoPrevia] = useState(false);
  const [rodando, setRodando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDesfazerFinanceira | null>(null);
  // O botão que abre a prévia (e depois "Confirmar reversão") some do DOM
  // assim que o painel seguinte aparece — sem isso, o foco cai pro
  // <body> sem aviso nenhum, achado na auditoria de acessibilidade.
  const painelPreviaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previa) painelPreviaRef.current?.focus();
  }, [previa]);

  async function abrirPrevia() {
    setCarregandoPrevia(true);
    const resposta = await preverDesfazerImportacaoFinanceiraAction(importacaoId);
    setCarregandoPrevia(false);
    if ("erro" in resposta) {
      toast.error(resposta.erro);
      return;
    }
    setPrevia(resposta);
  }

  async function confirmar() {
    if (!previa) return;
    setRodando(true);
    let resposta: ResultadoDesfazerFinanceira | { erro: string };
    try {
      resposta = await desfazerImportacaoFinanceiraAction(importacaoId, previa, incluirModificados);
    } catch {
      resposta = { erro: "Falha inesperada ao desfazer a importação. Tente de novo." };
    }
    setRodando(false);
    setPrevia(null);

    if ("erro" in resposta) {
      toast.error(resposta.erro);
      return;
    }
    setResultado(resposta);
    router.refresh();
  }

  if (previa) {
    const totalAReverter = incluirModificados ? previa.aReverter.length + previa.protegidosPorModificacao.length : previa.aReverter.length;
    return (
      <div
        ref={painelPreviaRef}
        tabIndex={-1}
        className="flex max-w-md flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 outline-none"
      >
        <div className="flex gap-2">
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-destructive" />
          <div className="space-y-1.5 text-xs text-foreground">
            <p className="font-medium">Serão revertidos: {totalAReverter} lançamento(s).</p>
            {previa.comBaixaRevertida.length > 0 && (
              <p>
                Destes, {previa.comBaixaRevertida.length} já {previa.comBaixaRevertida.length === 1 ? "estava quitado" : "estavam quitados"} — a
                baixa/recebimento também será revertida.
              </p>
            )}
            {previa.entidadesARemover.length > 0 && <p>Serão removidos: {previa.entidadesARemover.length} cadastro(s) criados só por esta importação.</p>}
            {previa.entidadesPreservadas.length > 0 && (
              <p>Serão preservados: {previa.entidadesPreservadas.length} cadastro(s) em uso fora desta importação.</p>
            )}
            {previa.protegidosPorModificacao.length > 0 && (
              <label className="flex items-center gap-2 pt-1">
                <Checkbox checked={incluirModificados} onCheckedChange={(v) => setIncluirModificados(v === true)} />
                Incluir {previa.protegidosPorModificacao.length} lançamento(s) modificado(s) manualmente depois da importação
              </label>
            )}
            {totalAReverter === 0 && <p>Nada pode ser revertido automaticamente — todos os lançamentos precisam de atenção manual.</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="destructive" disabled={rodando || totalAReverter === 0} onClick={confirmar}>
            {rodando ? "Desfazendo..." : "Confirmar reversão"}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={rodando} onClick={() => setPrevia(null)}>
            Cancelar
          </Button>
        </div>
        {rodando && (
          <IndicadorProcessando
            titulo="Desfazendo a importação..."
            descricao="Isso pode levar alguns segundos. Não feche nem saia desta página até terminar."
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" size="sm" className="gap-1.5 text-destructive" disabled={carregandoPrevia} onClick={abrirPrevia}>
        <Trash size={14} />
        {carregandoPrevia ? "Avaliando..." : "Desfazer importação"}
      </Button>
      {resultado && (
        <div role="status" className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            {resultado.eventosRevertidos} lançamento(s) revertido(s), {resultado.entidadesRemovidas} cadastro(s) removido(s).
          </p>
          {resultado.eventosComErro.length > 0 && (
            <p role="alert" className="mt-1 text-destructive">
              {resultado.eventosComErro.length} falharam ao reverter — veja os detalhes no lançamento.
            </p>
          )}
          {resultado.entidadesComErro.length > 0 && (
            <p role="alert" className="mt-1 text-destructive">
              {resultado.entidadesComErro.length} cadastro(s) não puderam ser removidos ({resultado.entidadesComErro.map((e) => e.nome).join(", ")}) — ficaram em uso por outro registro criado depois.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
