"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enviarOrcamentoAction, reenviarOrcamentoAction, aprovarVendaAction, recusarVendaAction } from "@/lib/vendas/vendas-actions";
import type { Database } from "@/utils/supabase/database.types";

type StatusVenda = Database["public"]["Enums"]["status_venda"];

function validadeSugerida(): string {
  return new Date(new Date().getTime() + 15 * 86_400_000).toISOString().slice(0, 10);
}

export function VendaAcoes({ vendaId, status }: { vendaId: string; status: StatusVenda }) {
  const router = useRouter();
  const [mostrarEnvio, setMostrarEnvio] = useState(false);
  const [validade, setValidade] = useState(validadeSugerida);
  const [enviando, setEnviando] = useState<"enviar" | "reenviar" | "aprovar" | "recusar" | null>(null);
  const [erro, setErro] = useState("");

  async function executar(acao: "enviar" | "reenviar" | "aprovar" | "recusar") {
    setEnviando(acao);
    setErro("");
    const resultado =
      acao === "enviar"
        ? await enviarOrcamentoAction(vendaId, validade)
        : acao === "reenviar"
          ? await reenviarOrcamentoAction(vendaId, validade)
          : acao === "aprovar"
            ? await aprovarVendaAction(vendaId)
            : await recusarVendaAction(vendaId);
    setEnviando(null);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
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

  if (status !== "RASCUNHO" && status !== "ENVIADO") return null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      {mostrarEnvio && status === "RASCUNHO" && (
        <div className="flex items-end gap-2">
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
        </div>
      )}

      <div className="flex items-center gap-2">
        {status === "RASCUNHO" &&
          (!mostrarEnvio ? (
            <Button type="button" variant="outline" size="sm" disabled={enviando !== null} onClick={() => setMostrarEnvio(true)}>
              Enviar orçamento
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" disabled={enviando !== null} onClick={() => executar("enviar")}>
              {enviando === "enviar" ? <Spinner size={14} className="animate-spin" /> : "Confirmar envio"}
            </Button>
          ))}
        <Button type="button" variant="outline" size="sm" disabled={enviando !== null} onClick={() => executar("recusar")}>
          {enviando === "recusar" ? <Spinner size={14} className="animate-spin" /> : "Recusar"}
        </Button>
        <Button type="button" size="sm" disabled={enviando !== null} onClick={() => executar("aprovar")}>
          {enviando === "aprovar" ? <Spinner size={14} className="animate-spin" /> : "Aprovar"}
        </Button>
      </div>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}
