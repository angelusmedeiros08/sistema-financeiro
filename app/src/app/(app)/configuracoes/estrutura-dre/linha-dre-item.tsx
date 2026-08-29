"use client";

import { useTransition } from "react";
import { ArrowUp, ArrowDown, X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, moverItem } from "@/lib/utils";
import type { LinhaDreConfig } from "@/lib/relatorios/dre";
import {
  removerLinhaDreAction,
  reordenarLinhasDreAction,
  vincularCategoriaDreAction,
  desvincularCategoriaDreAction,
  editarIdDfcLinhaDreAction,
} from "@/lib/relatorios/dre-actions";
import { OPCOES_ID_DFC } from "./nova-linha-form";

type Categoria = { id: string; nome: string; tipo: "RECEITA" | "DESPESA" };

const SEM_ATIVIDADE = "NENHUMA";

const ROTULO_TIPO: Record<LinhaDreConfig["tipoCalc"], string> = {
  FOLHA: "Folha",
  SUBTOTAL: "Subtotal",
  SUBTOTAL_ALTERNATIVO: "Rota paralela",
  RESULTADO_NAO_OPERACIONAL: "Resultado não operacional",
};

const CLASSE_BADGE_TIPO: Record<LinhaDreConfig["tipoCalc"], string> = {
  FOLHA: "bg-muted text-muted-foreground",
  SUBTOTAL: "bg-[#7A8B5C]/12 text-[#4F5C3A]",
  SUBTOTAL_ALTERNATIVO: "bg-[#7A8B5C]/12 text-[#4F5C3A]",
  RESULTADO_NAO_OPERACIONAL: "bg-[#C98A1F]/12 text-[#8A5E14]",
};

export function LinhaDreItem({
  linha,
  ehPrimeira,
  ehUltima,
  todasIdsEmOrdem,
  categoriasDisponiveis,
}: {
  linha: LinhaDreConfig;
  ehPrimeira: boolean;
  ehUltima: boolean;
  todasIdsEmOrdem: string[];
  categoriasDisponiveis: Categoria[];
}) {
  const [pendente, iniciarTransicao] = useTransition();

  function mover(direcao: -1 | 1) {
    const nova = moverItem(todasIdsEmOrdem, todasIdsEmOrdem.indexOf(linha.id), direcao);
    if (nova === todasIdsEmOrdem) return;
    iniciarTransicao(async () => {
      await reordenarLinhasDreAction(nova);
    });
  }

  return (
    <div className="rounded-2xl bg-card shadow-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <button
            type="button"
            disabled={ehPrimeira || pendente}
            onClick={() => mover(-1)}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            disabled={ehUltima || pendente}
            onClick={() => mover(1)}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowDown size={14} />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{linha.rotulo}</p>
        </div>

        <Badge className={cn("shrink-0 border-none font-semibold", CLASSE_BADGE_TIPO[linha.tipoCalc])}>{ROTULO_TIPO[linha.tipoCalc]}</Badge>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          disabled={pendente}
          onClick={() => iniciarTransicao(async () => {
            const formData = new FormData();
            formData.set("linha_id", linha.id);
            await removerLinhaDreAction(formData);
          })}
        >
          Remover
        </Button>
      </div>

      {linha.tipoCalc === "FOLHA" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-xs font-medium text-muted-foreground">Atividade de DFC:</span>
          <Select
            disabled={pendente}
            defaultValue={linha.idDfc ?? SEM_ATIVIDADE}
            onValueChange={(valor) =>
              iniciarTransicao(async () => {
                const formData = new FormData();
                formData.set("linha_id", linha.id);
                if (valor !== SEM_ATIVIDADE) formData.set("id_dfc", valor);
                await editarIdDfcLinhaDreAction(formData);
              })
            }
          >
            <SelectTrigger size="sm" className="h-6 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_ATIVIDADE}>Nenhuma (não afeta caixa)</SelectItem>
              {OPCOES_ID_DFC.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex w-full flex-wrap items-center gap-2 pt-1">
          {linha.categorias.map((categoria) => (
            <Badge key={categoria.id} className="gap-1 border-none bg-muted font-medium text-foreground">
              {categoria.nome}
              <button
                type="button"
                disabled={pendente}
                onClick={() => iniciarTransicao(async () => {
                  const formData = new FormData();
                  formData.set("linha_id", linha.id);
                  formData.set("categoria_id", categoria.id);
                  await desvincularCategoriaDreAction(formData);
                })}
              >
                <X size={11} />
              </button>
            </Badge>
          ))}

          {categoriasDisponiveis.length > 0 && (
            <Select
              disabled={pendente}
              onValueChange={(categoriaId) => iniciarTransicao(async () => {
                const formData = new FormData();
                formData.set("linha_id", linha.id);
                formData.set("categoria_id", categoriaId);
                await vincularCategoriaDreAction(formData);
              })}
            >
              <SelectTrigger size="sm" className="h-6 text-xs">
                <SelectValue placeholder="Vincular categoria..." />
              </SelectTrigger>
              <SelectContent>
                {categoriasDisponiveis.map((categoria) => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nome} ({categoria.tipo === "RECEITA" ? "receita" : "despesa"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
