"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { anexarDocumentoAction } from "@/lib/contabil/anexos-actions";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

const ROTULO_TIPO_ANEXO: Record<string, string> = {
  CONTRATO: "Contrato",
  DOCUMENTO_FISCAL: "Documento fiscal",
  DOCUMENTO_COBRANCA: "Documento de cobrança",
  OUTROS: "Outros",
};

const estadoInicial = { erro: "" };

// Anexa um documento a um dono que já existe de verdade (evento financeiro,
// baixa ou série) — diferente de AnexoCampos, que só junta rascunhos pra um
// dono que ainda vai nascer no mesmo submit.
export function AnexoForm({
  donoTipo,
  donoId,
  caminhoPagina,
  aoConcluir,
}: {
  donoTipo: "evento_financeiro_id" | "baixa_id" | "regra_recorrencia_id";
  donoId: string;
  caminhoPagina: string;
  aoConcluir?: () => void;
}) {
  const [forma, setForma] = useState<"ARQUIVO" | "LINK">("ARQUIVO");
  const [chaveFormulario, setChaveFormulario] = useState(0);
  const router = useRouter();

  const [, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await anexarDocumentoAction(formData);
    notificarResultado(resultado, "Anexo adicionado.");
    if ("erro" in resultado) return { erro: resultado.erro };
    setChaveFormulario((k) => k + 1);
    setForma("ARQUIVO");
    aoConcluir?.();
    router.refresh();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form key={chaveFormulario} action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name={donoTipo} value={donoId} />
      <input type="hidden" name="caminho_pagina" value={caminhoPagina} />

      <div className="space-y-1.5">
        <Label>Forma</Label>
        <Select name="forma" value={forma} onValueChange={(v) => setForma(v as "ARQUIVO" | "LINK")}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ARQUIVO">Arquivo</SelectItem>
            <SelectItem value="LINK">Link</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select name="tipo" defaultValue="OUTROS">
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ROTULO_TIPO_ANEXO).map(([valor, rotulo]) => (
              <SelectItem key={valor} value={valor}>
                {rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label>{forma === "ARQUIVO" ? "Arquivo (PDF, JPG, PNG ou WEBP até 10MB)" : "Link"}</Label>
        {forma === "ARQUIVO" ? (
          <Input name="arquivo" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required />
        ) : (
          <Input name="url" type="url" placeholder="https://..." required />
        )}
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label>Descrição (opcional)</Label>
        <Input name="descricao" type="text" placeholder="Ex.: comprovante PIX" />
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pendente} size="sm">
          {pendente ? "Enviando..." : "Anexar"}
        </Button>
      </div>
    </form>
  );
}
