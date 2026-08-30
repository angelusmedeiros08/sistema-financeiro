"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  enviarOrcamentoAction,
  reenviarOrcamentoAction,
  aprovarOrcamentoManualAction,
  recusarOrcamentoManualAction,
} from "@/lib/orcamentos-comerciais/orcamentos-comerciais-actions";
import type { Database } from "@/utils/supabase/database.types";

type StatusOrcamentoComercial = Database["public"]["Enums"]["status_orcamento_comercial"];

function validadeSugerida(): string {
  return new Date(new Date().getTime() + 15 * 86_400_000).toISOString().slice(0, 10);
}

export function OrcamentoAcoes({ orcamentoId, status }: { orcamentoId: string; status: StatusOrcamentoComercial }) {
  const router = useRouter();
  const [mostrarEnvio, setMostrarEnvio] = useState(false);
  const [mostrarRecusa, setMostrarRecusa] = useState(false);
  const [validade, setValidade] = useState(validadeSugerida);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState<"enviar" | "reenviar" | "aprovar" | "recusar" | null>(null);
  const [erro, setErro] = useState("");

  async function executar(acao: "enviar" | "reenviar" | "aprovar" | "recusar") {
    setEnviando(acao);
    setErro("");
    const resultado =
      acao === "enviar" ? await enviarOrcamentoAction(orcamentoId, validade)
      : acao === "reenviar" ? await reenviarOrcamentoAction(orcamentoId, validade)
      : acao === "aprovar" ? await aprovarOrcamentoManualAction(orcamentoId)
      : await recusarOrcamentoManualAction(orcamentoId, motivo);
    setEnviando(null);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  }

  if (status === "RASCUNHO") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-end gap-2">
          {mostrarEnvio && (
            <div className="space-y-1">
              <Label htmlFor="validade_envio" className="text-[11px]">
                Validade
              </Label>
              <Input
                id="validade_envio"
                type="date"
                value={validade}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setValidade(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
          )}
          {!mostrarEnvio ? (
            <Button type="button" size="sm" disabled={enviando !== null} onClick={() => setMostrarEnvio(true)}>
              Enviar orçamento
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={enviando !== null} onClick={() => executar("enviar")}>
              {enviando === "enviar" ? <Spinner size={14} className="animate-spin" /> : "Confirmar envio"}
            </Button>
          )}
        </div>
        {erro && <p className="text-xs text-destructive">{erro}</p>}
      </div>
    );
  }

  if (status === "EXPIRADO") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-end gap-2">
          {mostrarEnvio && (
            <div className="space-y-1">
              <Label htmlFor="validade_reenvio" className="text-[11px]">
                Nova validade
              </Label>
              <Input
                id="validade_reenvio"
                type="date"
                value={validade}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setValidade(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
          )}
          {!mostrarEnvio ? (
            <Button type="button" variant="outline" size="sm" disabled={enviando !== null} onClick={() => setMostrarEnvio(true)}>
              Reenviar orçamento
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={enviando !== null} onClick={() => executar("reenviar")}>
              {enviando === "reenviar" ? <Spinner size={14} className="animate-spin" /> : "Confirmar reenvio"}
            </Button>
          )}
        </div>
        {erro && <p className="text-xs text-destructive">{erro}</p>}
      </div>
    );
  }

  if (status !== "ENVIADO") return null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      {mostrarRecusa && (
        <Textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo da recusa (opcional)"
          rows={2}
          className="w-64 text-xs"
        />
      )}
      <div className="flex items-center gap-2">
        {!mostrarRecusa ? (
          <Button type="button" variant="outline" size="sm" disabled={enviando !== null} onClick={() => setMostrarRecusa(true)}>
            Recusar manualmente
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled={enviando !== null} onClick={() => executar("recusar")}>
            {enviando === "recusar" ? <Spinner size={14} className="animate-spin" /> : "Confirmar recusa"}
          </Button>
        )}
        <Button type="button" size="sm" disabled={enviando !== null} onClick={() => executar("aprovar")}>
          {enviando === "aprovar" ? <Spinner size={14} className="animate-spin" /> : "Aprovar manualmente"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Só use se o cliente respondeu por outro canal — o link público continua valendo.</p>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}
