"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUUpLeft, XCircle, ShieldCheck } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { IndicadorProcessando } from "@/components/ui/indicador-processando";
import { ImpactoLinha } from "./impacto-linha";
import { BannerDesfeita } from "./banner-desfeita";
import { preverDesfazerImportacaoFinanceiraAction, desfazerImportacaoFinanceiraAction } from "../../actions";
import type { PreviaDesfazerFinanceira, ResultadoDesfazerFinanceira } from "@/lib/importacoes/importacoes-financeiro";

// Substitui desfazer-painel-financeiro.tsx (apagado) — mesmo par de
// actions e mesma lógica de estado, casca visual igual à variante de
// pessoas (ver fluxo-desfazer-pessoas.tsx), preservando o checkbox
// "incluir modificados manualmente" que só este fluxo tem.
export function FluxoDesfazerFinanceiro({ importacaoId }: { importacaoId: string }) {
  const router = useRouter();
  const [previa, setPrevia] = useState<PreviaDesfazerFinanceira | null>(null);
  const [incluirModificados, setIncluirModificados] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [rodando, setRodando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDesfazerFinanceira | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const resposta = await preverDesfazerImportacaoFinanceiraAction(importacaoId);
      if (cancelado) return;
      setCarregando(false);
      if ("erro" in resposta) {
        toast.error(resposta.erro);
        return;
      }
      setPrevia(resposta);
    })();
    return () => {
      cancelado = true;
    };
  }, [importacaoId]);

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

    if ("erro" in resposta) {
      toast.error(resposta.erro);
      return;
    }
    setPrevia(null);
    setResultado(resposta);
    router.refresh();
  }

  if (carregando) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    );
  }

  if (resultado) {
    const partes = [`${resultado.eventosRevertidos} lançamento(s) revertido(s)`, `${resultado.entidadesRemovidas} cadastro(s) removido(s)`];
    if (resultado.eventosComErro.length > 0) partes.push(`${resultado.eventosComErro.length} falharam ao reverter`);
    if (resultado.entidadesComErro.length > 0) partes.push(`${resultado.entidadesComErro.length} cadastro(s) não puderam ser removidos`);
    return <BannerDesfeita agora quando={new Date().toISOString()} resumo={partes.join(", ") + "."} />;
  }

  if (!previa) return null;

  const totalAReverter = incluirModificados ? previa.aReverter.length + previa.protegidosPorModificacao.length : previa.aReverter.length;

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">O que vai acontecer</div>

      {totalAReverter > 0 && (
        <ImpactoLinha
          icone={<ArrowUUpLeft size={14} weight="bold" />}
          cor="reversao"
          titulo={`${totalAReverter} lançamento(s) revertido(s)`}
          descricao={
            previa.comBaixaRevertida.length > 0
              ? `${previa.comBaixaRevertida.length} já ${previa.comBaixaRevertida.length === 1 ? "estava quitado" : "estavam quitados"} — a baixa/recebimento também será revertida.`
              : "Nenhum já quitado."
          }
        />
      )}
      {previa.entidadesARemover.length > 0 && (
        <ImpactoLinha
          icone={<XCircle size={14} weight="bold" />}
          cor="remocao"
          titulo={`${previa.entidadesARemover.length} cadastro(s) removido(s)`}
          descricao="Criados só por esta importação."
        />
      )}
      {previa.entidadesPreservadas.length > 0 && (
        <ImpactoLinha
          icone={<ShieldCheck size={14} weight="bold" />}
          cor="protegido"
          titulo={`${previa.entidadesPreservadas.length} cadastro(s) preservado(s)`}
          descricao="Em uso fora desta importação."
        />
      )}
      {previa.protegidosPorModificacao.length > 0 && (
        <label className="flex items-center gap-2 py-3 text-sm text-foreground">
          <Checkbox checked={incluirModificados} onCheckedChange={(v) => setIncluirModificados(v === true)} />
          Incluir {previa.protegidosPorModificacao.length} lançamento(s) modificado(s) manualmente depois da importação
        </label>
      )}
      {totalAReverter === 0 && (
        <p className="py-3 text-sm text-muted-foreground">Nada pode ser revertido automaticamente — todos os lançamentos precisam de atenção manual.</p>
      )}

      <div className="mt-4 flex gap-2">
        <Button type="button" variant="destructive" disabled={rodando || totalAReverter === 0} onClick={confirmar}>
          {rodando ? "Desfazendo..." : "Confirmar reversão"}
        </Button>
        <Button type="button" variant="ghost" disabled={rodando} onClick={() => router.push(`/importacao/historico/${importacaoId}`)}>
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
