"use client";

import { useEffect, useState } from "react";
import { CaretDown, Plus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatarMoeda } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

type Categoria = { id: string; nome: string };
type CentroCusto = { id: string; nome: string };

type SubLinhaCentroCusto = { centro_custo_id: string; valor: number; percentual: number };

type Linha = {
  categoria_id: string;
  valor: number;
  percentual: number;
  centroCustoUnico: string;
  centroCustoDividido: boolean;
  subLinhasCentroCusto: SubLinhaCentroCusto[];
};

const linhaVazia = (): Linha => ({
  categoria_id: "",
  valor: 0,
  percentual: 0,
  centroCustoUnico: "",
  centroCustoDividido: false,
  subLinhasCentroCusto: [],
});

const subLinhaVazia = (): SubLinhaCentroCusto => ({ centro_custo_id: "", valor: 0, percentual: 0 });

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

function linhaCentroCustoValida(linha: Linha): boolean {
  if (!linha.centroCustoDividido) return true;
  const soma = arredondarCentavos(linha.subLinhasCentroCusto.reduce((acc, s) => acc + s.valor, 0));
  const diferenca = arredondarCentavos(linha.valor - soma);
  return diferenca === 0 && linha.subLinhasCentroCusto.every((s) => s.centro_custo_id && s.valor > 0);
}

function serializarLinha(linha: Linha) {
  const base = { categoria_id: linha.categoria_id, valor: linha.valor };
  if (linha.centroCustoDividido) {
    return { ...base, centros_custo: linha.subLinhasCentroCusto.filter((s) => s.centro_custo_id) };
  }
  if (linha.centroCustoUnico) {
    return { ...base, centro_custo_id: linha.centroCustoUnico };
  }
  return base;
}

export function RateioCategorias({
  categorias,
  centrosCusto,
  valorTotal,
  onValidacaoChange,
}: {
  categorias: Categoria[];
  centrosCusto: CentroCusto[];
  valorTotal: number;
  onValidacaoChange: (valido: boolean) => void;
}) {
  const [linhas, setLinhas] = useState<Linha[]>(() => [
    { ...linhaVazia(), valor: valorTotal, percentual: 100 },
    linhaVazia(),
  ]);

  const somaValores = arredondarCentavos(linhas.reduce((acc, l) => acc + l.valor, 0));
  const diferenca = arredondarCentavos(valorTotal - somaValores);
  const todasPreenchidas = linhas.every((l) => l.categoria_id && l.valor > 0);
  const centrosCustoValidos = linhas.every(linhaCentroCustoValida);

  useEffect(() => {
    onValidacaoChange(diferenca === 0 && todasPreenchidas && centrosCustoValidos && linhas.length >= 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diferenca, todasPreenchidas, centrosCustoValidos, linhas.length]);

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

  function alternarDividirCentroCusto(indice: number) {
    setLinhas((atual) =>
      atual.map((l, i) => {
        if (i !== indice) return l;
        if (l.centroCustoDividido) {
          return { ...l, centroCustoDividido: false, subLinhasCentroCusto: [] };
        }
        return {
          ...l,
          centroCustoDividido: true,
          centroCustoUnico: "",
          subLinhasCentroCusto: [
            { centro_custo_id: "", valor: l.valor, percentual: 100 },
            subLinhaVazia(),
          ],
        };
      }),
    );
  }

  function atualizarSubLinha(indiceLinha: number, indiceSub: number, mudanca: Partial<SubLinhaCentroCusto>) {
    setLinhas((atual) =>
      atual.map((l, i) => {
        if (i !== indiceLinha) return l;
        return {
          ...l,
          subLinhasCentroCusto: l.subLinhasCentroCusto.map((s, j) => (j === indiceSub ? { ...s, ...mudanca } : s)),
        };
      }),
    );
  }

  function mudarSubValor(indiceLinha: number, indiceSub: number, texto: string, valorLinha: number) {
    const valor = arredondarCentavos(parseNumeroDigitado(texto));
    const percentual = valorLinha > 0 ? arredondarCentavos((valor / valorLinha) * 100) : 0;
    atualizarSubLinha(indiceLinha, indiceSub, { valor, percentual });
  }

  function mudarSubPercentual(indiceLinha: number, indiceSub: number, texto: string, valorLinha: number) {
    const percentual = parseNumeroDigitado(texto);
    const valor = arredondarCentavos((percentual / 100) * valorLinha);
    atualizarSubLinha(indiceLinha, indiceSub, { valor, percentual });
  }

  function adicionarSubLinha(indiceLinha: number) {
    setLinhas((atual) =>
      atual.map((l, i) => (i === indiceLinha ? { ...l, subLinhasCentroCusto: [...l.subLinhasCentroCusto, subLinhaVazia()] } : l)),
    );
  }

  function removerSubLinha(indiceLinha: number, indiceSub: number) {
    setLinhas((atual) =>
      atual.map((l, i) =>
        i === indiceLinha ? { ...l, subLinhasCentroCusto: l.subLinhasCentroCusto.filter((_, j) => j !== indiceSub) } : l,
      ),
    );
  }

  const categoriasEscolhidas = new Set(linhas.map((l) => l.categoria_id).filter(Boolean));

  return (
    <div className="space-y-2">
      <input type="hidden" name="rateio_json" value={JSON.stringify(linhas.filter((l) => l.categoria_id).map(serializarLinha))} />

      <div className="space-y-3">
        {linhas.map((linha, indice) => {
          const opcoesDisponiveis = categorias.filter(
            (c) => c.id === linha.categoria_id || !categoriasEscolhidas.has(c.id),
          );
          const somaSub = arredondarCentavos(linha.subLinhasCentroCusto.reduce((acc, s) => acc + s.valor, 0));
          const diferencaSub = arredondarCentavos(linha.valor - somaSub);
          const centrosCustoEscolhidos = new Set(linha.subLinhasCentroCusto.map((s) => s.centro_custo_id).filter(Boolean));

          return (
            <div key={indice} className="space-y-1.5 rounded-xl border border-border/60 p-2">
              <div className="grid grid-cols-[1fr_100px_84px_auto] items-center gap-2">
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

              {centrosCusto.length > 0 && (
                <div className="pl-1">
                  {!linha.centroCustoDividido ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={linha.centroCustoUnico}
                        onValueChange={(v) => atualizarLinha(indice, { centroCustoUnico: v })}
                      >
                        <SelectTrigger className="h-7 w-full max-w-56 text-xs">
                          <SelectValue placeholder="Centro de custo (opcional)..." />
                        </SelectTrigger>
                        <SelectContent>
                          {centrosCusto.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => alternarDividirCentroCusto(indice)}
                        className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        Dividir
                        <CaretDown size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 rounded-lg bg-muted/40 p-2">
                      {linha.subLinhasCentroCusto.map((sub, indiceSub) => {
                        const opcoesSub = centrosCusto.filter(
                          (c) => c.id === sub.centro_custo_id || !centrosCustoEscolhidos.has(c.id),
                        );
                        return (
                          <div key={indiceSub} className="grid grid-cols-[1fr_84px_70px_auto] items-center gap-1.5">
                            <Select
                              value={sub.centro_custo_id}
                              onValueChange={(v) => atualizarSubLinha(indice, indiceSub, { centro_custo_id: v })}
                            >
                              <SelectTrigger className="h-7 w-full text-xs">
                                <SelectValue placeholder="Centro de custo..." />
                              </SelectTrigger>
                              <SelectContent>
                                {opcoesSub.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              className="h-7 text-xs"
                              type="text"
                              inputMode="decimal"
                              value={formatarNumero(sub.valor)}
                              onChange={(e) => mudarSubValor(indice, indiceSub, e.target.value, linha.valor)}
                              aria-label="Valor do centro de custo"
                            />
                            <Input
                              className="h-7 text-xs"
                              type="text"
                              inputMode="decimal"
                              value={formatarNumero(sub.percentual)}
                              onChange={(e) => mudarSubPercentual(indice, indiceSub, e.target.value, linha.valor)}
                              aria-label="Percentual do centro de custo"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              disabled={linha.subLinhasCentroCusto.length <= 2}
                              onClick={() => removerSubLinha(indice, indiceSub)}
                            >
                              <X size={13} />
                            </Button>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between pt-0.5">
                        <button
                          type="button"
                          onClick={() => adicionarSubLinha(indice)}
                          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          <Plus size={11} />
                          Adicionar
                        </button>
                        <button
                          type="button"
                          onClick={() => alternarDividirCentroCusto(indice)}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          Usar 1 centro de custo
                        </button>
                        <p className={cn("text-xs font-medium", diferencaSub === 0 ? "text-positivo" : "text-destructive")}>
                          {diferencaSub === 0 ? "Bate certinho" : formatarMoeda(diferencaSub)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={adicionarLinha}>
          <Plus size={13} />
          Adicionar categoria
        </Button>
        <p className={cn("text-xs font-medium", diferenca === 0 ? "text-positivo" : "text-destructive")}>
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
