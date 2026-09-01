"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUUpLeft, XCircle, ShieldCheck } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IndicadorProcessando } from "@/components/ui/indicador-processando";
import { ImpactoLinha } from "./impacto-linha";
import { BannerDesfeita } from "./banner-desfeita";
import { preverDesfazerImportacaoAction, desfazerImportacaoAction } from "../../actions";
import { formatarMoeda } from "@/lib/formatacao";
import type { PreviaDesfazerImportacaoPessoas, ResultadoDesfazerImportacaoPessoas } from "@/lib/importacoes/importacoes";

// Substitui desfazer-painel.tsx (apagado) — mesma lógica de estado e
// mesmas actions, só a casca visual mudou: a prévia carrega sozinha ao
// entrar nesta tela dedicada (quem chegou aqui já veio com a intenção de
// desfazer, não precisa de mais um clique), e o impacto vira linhas
// (ImpactoLinha) em vez de parágrafo corrido.
export function FluxoDesfazerPessoas({ importacaoId }: { importacaoId: string }) {
  const router = useRouter();
  const [previa, setPrevia] = useState<PreviaDesfazerImportacaoPessoas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [rodando, setRodando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDesfazerImportacaoPessoas | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const resposta = await preverDesfazerImportacaoAction(importacaoId);
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
    let resposta: ResultadoDesfazerImportacaoPessoas | { erro: string };
    try {
      resposta = await desfazerImportacaoAction(importacaoId, previa);
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
    return (
      <BannerDesfeita
        agora
        quando={new Date().toISOString()}
        resumo={`${resultado.removidas} pessoa${resultado.removidas !== 1 ? "s" : ""} removida${resultado.removidas !== 1 ? "s" : ""}, ${resultado.eventosRevertidos} lançamento(s) revertido(s).`}
      />
    );
  }

  if (!previa) return null;

  const valorTotalEventos = previa.eventosAReverter.reduce((acc, e) => acc + e.valor, 0);
  const temPessoasProtegidas = previa.protegidas.length > 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">O que vai acontecer</div>

      {previa.pessoasARemover.length > 0 && (
        <ImpactoLinha
          icone={<XCircle size={14} weight="bold" />}
          cor="remocao"
          titulo={`${previa.pessoasARemover.length} pessoa${previa.pessoasARemover.length !== 1 ? "s" : ""} removida${previa.pessoasARemover.length !== 1 ? "s" : ""}`}
          descricao="Cadastros criados só por esta importação."
        />
      )}
      {previa.eventosAReverter.length > 0 && (
        <ImpactoLinha
          icone={<ArrowUUpLeft size={14} weight="bold" />}
          cor="reversao"
          titulo={`${previa.eventosAReverter.length} lançamento(s) revertido(s)`}
          descricao={`${formatarMoeda(valorTotalEventos)} no total — inclui baixa/recebimento já registrado, se houver.`}
        />
      )}
      {temPessoasProtegidas && (
        <ImpactoLinha
          icone={<ShieldCheck size={14} weight="bold" />}
          cor="protegido"
          titulo={`${previa.protegidas.length} pessoa(s) preservada(s)`}
          descricao={previa.protegidas.map((p) => `${p.nome} — ${p.motivo}`).join("; ")}
        />
      )}
      {previa.pessoasARemover.length === 0 && (
        <p className="py-3 text-sm text-muted-foreground">Nenhuma pessoa pode ser removida automaticamente — todas precisam de atenção manual.</p>
      )}

      <div className="mt-4 flex gap-2">
        <Button type="button" variant="destructive" disabled={rodando || previa.pessoasARemover.length === 0} onClick={confirmar}>
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
