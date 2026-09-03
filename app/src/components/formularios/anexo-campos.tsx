"use client";

import { useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROTULO_TIPO_ANEXO: Record<string, string> = {
  CONTRATO: "Contrato",
  DOCUMENTO_FISCAL: "Documento fiscal",
  DOCUMENTO_COBRANCA: "Documento de cobrança",
  OUTROS: "Outros",
};

type LinhaDraft = { id: number; forma: "ARQUIVO" | "LINK" };

// Linhas de anexo "rascunho" pra formulários que ainda não têm um dono
// (evento financeiro / regra de recorrência) no momento em que o usuário
// preenche — cada linha vira campos independentes anexo_{indice}_* no mesmo
// <form>, lidos por extrairAnexosDraftDoFormData() só depois que o
// lançamento em si já foi criado com sucesso.
export function AnexoCampos() {
  const [linhas, setLinhas] = useState<LinhaDraft[]>([]);
  let proximoId = linhas.length ? Math.max(...linhas.map((l) => l.id)) + 1 : 0;

  return (
    <div className="space-y-3">
      <input type="hidden" name="anexo_count" value={linhas.length} />

      {linhas.map((linha, indice) => (
        <LinhaAnexo
          key={linha.id}
          indice={indice}
          formaInicial={linha.forma}
          onFormaChange={(forma) =>
            setLinhas((ls) => ls.map((l) => (l.id === linha.id ? { ...l, forma } : l)))
          }
          onRemover={() => setLinhas((ls) => ls.filter((l) => l.id !== linha.id))}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setLinhas((ls) => [...ls, { id: proximoId++, forma: "ARQUIVO" }])}
      >
        <Plus size={14} />
        Adicionar anexo
      </Button>
    </div>
  );
}

function LinhaAnexo({
  indice,
  formaInicial,
  onFormaChange,
  onRemover,
}: {
  indice: number;
  formaInicial: "ARQUIVO" | "LINK";
  onFormaChange: (forma: "ARQUIVO" | "LINK") => void;
  onRemover: () => void;
}) {
  const [forma, setForma] = useState<"ARQUIVO" | "LINK">(formaInicial);

  return (
    <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[110px_1fr_150px_auto]">
      <div className="space-y-1">
        <Label htmlFor={`anexo_${indice}_forma`} className="text-xs">
          Forma
        </Label>
        <Select
          name={`anexo_${indice}_forma`}
          defaultValue={forma}
          onValueChange={(v) => {
            setForma(v as "ARQUIVO" | "LINK");
            onFormaChange(v as "ARQUIVO" | "LINK");
          }}
        >
          <SelectTrigger id={`anexo_${indice}_forma`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ARQUIVO">Arquivo</SelectItem>
            <SelectItem value="LINK">Link</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor={forma === "ARQUIVO" ? `anexo_${indice}_arquivo` : `anexo_${indice}_url`} className="text-xs">
          {forma === "ARQUIVO" ? "Arquivo" : "URL"}
        </Label>
        {forma === "ARQUIVO" ? (
          <Input id={`anexo_${indice}_arquivo`} name={`anexo_${indice}_arquivo`} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="text-sm" />
        ) : (
          <Input id={`anexo_${indice}_url`} name={`anexo_${indice}_url`} type="url" placeholder="https://..." />
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor={`anexo_${indice}_tipo`} className="text-xs">
          Tipo
        </Label>
        <Select name={`anexo_${indice}_tipo`} defaultValue="OUTROS">
          <SelectTrigger id={`anexo_${indice}_tipo`} className="w-full">
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

      <div className="flex items-end">
        <Button type="button" variant="ghost" size="icon" onClick={onRemover} aria-label="Remover anexo">
          <X size={16} />
        </Button>
      </div>

      <input type="hidden" name={`anexo_${indice}_descricao`} value="" />
    </div>
  );
}
