"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatarMoeda } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

type Categoria = { id: string; nome: string };
type Linha = { categoria_id: string; valor: number; percentual: number };

const linhaVazia = (): Linha => ({ categoria_id: "", valor: 0, percentual: 0 });

function arredondarCentavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function formatarNumero(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

function parseNumeroDigitado(texto: string): number {
  const numero = Number(texto.replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

export function RateioCategorias({
  categorias,
  valorTotal,
  onValidacaoChange,
}: {
  categorias: Categoria[];
  valorTotal: number;
  onValidacaoChange: (valido: boolean) => void;
}) {
  const [linhas, setLinhas] = useState<Linha[]>(() => [
    { categoria_id: "", valor: valorTotal, percentual: 100 },
    linhaVazia(),
  ]);

  const somaValores = arredondarCentavos(linhas.reduce((acc, l) => acc + l.valor, 0));
  const diferenca = arredondarCentavos(valorTotal - somaValores);
  const todasPreenchidas = linhas.every((l) => l.categoria_id && l.valor > 0);

  useEffect(() => {
    onValidacaoChange(diferenca === 0 && todasPreenchidas && linhas.length >= 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diferenca, todasPreenchidas, linhas.length]);

  function atualizarLinha(indice: number, mudanca: Partial<Linha>) {
    setLinhas((atual) => atual.map((l, i) => (i === indice ? { ...l, ...mudanca } : l)));
  }

  function mudarValor(indice: number, texto: string) {
    const valor = arredondarCentavos(parseNumeroDigitado(texto));
    const percentual = valorTotal > 0 ? arredondarCentavos((valor / valorTotal) * 100) : 0;
    atualizarLinha(indice, { valor, percentual });
  }

  function mudarPercentual(indice: number, texto: string) {
    const percentual = parseNumeroDigitado(texto);
    const valor = arredondarCentavos((percentual / 100) * valorTotal);
    atualizarLinha(indice, { valor, percentual });
  }

  function adicionarLinha() {
    setLinhas((atual) => [...atual, linhaVazia()]);
  }

  function removerLinha(indice: number) {
    setLinhas((atual) => atual.filter((_, i) => i !== indice));
  }

  const categoriasEscolhidas = new Set(linhas.map((l) => l.categoria_id).filter(Boolean));

  return (
    <div className="space-y-2">
      <input type="hidden" name="rateio_json" value={JSON.stringify(linhas.filter((l) => l.categoria_id))} />

      <div className="space-y-2">
        {linhas.map((linha, indice) => {
          const opcoesDisponiveis = categorias.filter(
            (c) => c.id === linha.categoria_id || !categoriasEscolhidas.has(c.id),
          );
          return (
            <div key={indice} className="grid grid-cols-[1fr_100px_84px_auto] items-center gap-2">
              <Select value={linha.categoria_id} onValueChange={(v) => atualizarLinha(indice, { categoria_id: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Categoria..." />
                </SelectTrigger>
                <SelectContent>
                  {opcoesDisponiveis.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="text"
                inputMode="decimal"
                value={formatarNumero(linha.valor)}
                onChange={(e) => mudarValor(indice, e.target.value)}
                aria-label="Valor da linha"
              />
              <Input
                type="text"
                inputMode="decimal"
                value={formatarNumero(linha.percentual)}
                onChange={(e) => mudarPercentual(indice, e.target.value)}
                aria-label="Percentual da linha"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={linhas.length <= 2}
                onClick={() => removerLinha(indice)}
              >
                <X size={15} />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={adicionarLinha}>
          <Plus size={13} />
          Adicionar categoria
        </Button>
        <p
          className={cn(
            "text-xs font-medium",
            diferenca === 0 ? "text-[#157F6B]" : "text-[#D8583A]",
          )}
        >
          {diferenca === 0
            ? "Soma bate certinho"
            : diferenca > 0
              ? `Falta alocar ${formatarMoeda(diferenca)}`
              : `Excedeu em ${formatarMoeda(Math.abs(diferenca))}`}
        </p>
      </div>
    </div>
  );
}
