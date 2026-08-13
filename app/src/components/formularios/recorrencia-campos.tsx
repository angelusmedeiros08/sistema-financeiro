"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const ROTULO_UNIDADE: Record<string, string> = { DIA: "Dia(s)", SEMANA: "Semana(s)", MES: "Mês(es)" };

// Toggle "Repetir lançamento?" + campos de agendamento, revelados inline no
// mesmo formulário (nunca um modal ou tela separada) — mesmo padrão de
// progressive disclosure que "Habilitar rateio" já usa nesta tela.
export function RecorrenciaCampos() {
  const [ativo, setAtivo] = useState(false);
  const [tipoTermino, setTipoTermino] = useState<"OCORRENCIAS" | "DATA" | "INDEFINIDO">("OCORRENCIAS");

  return (
    <div className="space-y-3 rounded-xl border border-border p-3 sm:col-span-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="repetir_lancamento">Repetir lançamento?</Label>
        <Switch id="repetir_lancamento" name="repetir_lancamento" checked={ativo} onCheckedChange={setAtivo} />
      </div>

      {ativo && (
        <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="intervalo">Repetir a cada</Label>
            <div className="flex gap-2">
              <Input id="intervalo" name="intervalo" type="number" min={1} defaultValue={1} className="w-20" required />
              <Select name="unidade_intervalo" defaultValue="MES">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROTULO_UNIDADE).map(([valor, rotulo]) => (
                    <SelectItem key={valor} value={valor}>
                      {rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Término da recorrência</Label>
            <RadioGroup
              name="tipo_termino"
              value={tipoTermino}
              onValueChange={(v) => setTipoTermino(v as typeof tipoTermino)}
              className="gap-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="OCORRENCIAS" id="termino_ocorrencias" />
                <Label htmlFor="termino_ocorrencias" className="font-normal">
                  Após
                </Label>
                <Input
                  name="numero_ocorrencias"
                  type="number"
                  min={1}
                  defaultValue={12}
                  disabled={tipoTermino !== "OCORRENCIAS"}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">ocorrências</span>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="DATA" id="termino_data" />
                <Label htmlFor="termino_data" className="font-normal">
                  Até
                </Label>
                <Input name="data_fim" type="date" disabled={tipoTermino !== "DATA"} className="w-auto" />
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="INDEFINIDO" id="termino_indefinido" />
                <Label htmlFor="termino_indefinido" className="font-normal">
                  Indefinido, até cancelar a série
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      )}
    </div>
  );
}
