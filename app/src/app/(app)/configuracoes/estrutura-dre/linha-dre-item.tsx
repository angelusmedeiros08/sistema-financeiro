"use client";

import { useTransition } from "react";
import { ArrowUp, ArrowDown, X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { LinhaDreConfig } from "@/lib/relatorios/dre";
import {
  removerLinhaDreAction,
  reordenarLinhasDreAction,
  vincularCategoriaDreAction,
  desvincularCategoriaDreAction,
} from "@/lib/relatorios/dre-actions";

type Categoria = { id: string; nome: string; tipo: "RECEITA" | "DESPESA" };

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
    const indiceAtual = todasIdsEmOrdem.indexOf(linha.id);
    const indiceAlvo = indiceAtual + direcao;
    if (indiceAlvo < 0 || indiceAlvo >= todasIdsEmOrdem.length) return;

    const nova = [...todasIdsEmOrdem];
    [nova[indiceAtual], nova[indiceAlvo]] = [nova[indiceAlvo], nova[indiceAtual]];
    iniciarTransicao(async () => {
      await reordenarLinhasDreAction(nova);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
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

        <div className="flex-1">
          <p className="font-medium text-foreground">{linha.rotulo}</p>
        </div>

        <Badge className={cn("border-none font-semibold", linha.tipo === "SUBTOTAL" ? "bg-[#6A56D8]/12 text-[#4E3EAD]" : "bg-muted text-muted-foreground")}>
          {linha.tipo === "SUBTOTAL" ? "Subtotal" : "Folha"}
        </Badge>

        <Button
          type="button"
          variant="ghost"
          size="sm"
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

      {linha.tipo === "FOLHA" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
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
      )}
    </div>
  );
}
