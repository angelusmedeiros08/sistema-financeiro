"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretDown, WarningCircle } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PessoaCombobox } from "@/components/formularios/pessoa-combobox";
import { CentroCustoCombobox } from "@/components/formularios/centro-custo-combobox";
import { CategoriaCombobox } from "@/components/formularios/categoria-combobox";
import { RateioCategorias } from "@/components/formularios/rateio-categorias";
import { formatarMoeda } from "@/lib/formatacao";

type Categoria = { id: string; nome: string };
type Pessoa = { id: string; nome: string };
type CentroCusto = { id: string; nome: string };
type ResultadoAcao = { erro: string } | { sucesso: true; evento_id: string; recriado: boolean };

const estadoInicial = { erro: "" };

export type DadosEventoParaEdicao = {
  id: string;
  tipo: "RECEITA" | "DESPESA";
  descricao: string;
  valorTotal: number;
  categoriaAtual: Categoria | null;
  centroCustoAtual: CentroCusto | null;
  pessoaAtual: Pessoa | null;
  // Evento estornado não tem mais nada editável — nem descrição/pessoa,
  // já que estornarEventoFinanceiro/editarEventoFinanceiro rejeitam
  // qualquer UPDATE nele. A tela nem mostra o formulário nesse caso.
  estornado: boolean;
  // Só falso quando: 1 parcela, sem baixa viva, sem rateio pré-existente
  // (mesmas travas de editarEventoFinanceiro) — corrigir valor/categoria
  // sempre passa por estornar+recriar por baixo, porque o lançamento de
  // reconhecimento já é imutável.
  valorCategoriaEditavel: boolean;
  motivoBloqueio: string | null;
};

export function EditarEventoFinanceiro({
  evento,
  caminhoBase,
  categorias,
  pessoas,
  centrosCusto,
  acao,
}: {
  evento: DadosEventoParaEdicao;
  caminhoBase: "receitas" | "despesas";
  categorias: Categoria[];
  pessoas: Pessoa[];
  centrosCusto: CentroCusto[];
  acao: (formData: FormData) => Promise<ResultadoAcao>;
}) {
  const router = useRouter();
  const ehReceita = evento.tipo === "RECEITA";
  const [rateioAtivo, setRateioAtivo] = useState(false);
  const [rateioValido, setRateioValido] = useState(false);
  const [valorTexto, setValorTexto] = useState(evento.valorTotal.toFixed(2).replace(".", ","));
  const valorNumerico = Number(valorTexto.replace(",", ".")) || 0;

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await acao(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    if (resultado.recriado) {
      router.push(`/${caminhoBase}/${resultado.evento_id}`);
    } else {
      router.refresh();
    }
    return { erro: "" };
  }, estadoInicial);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${caminhoBase}`} className="hover:text-foreground">
          {ehReceita ? "Receitas" : "Despesas"}
        </Link>
        <span>/</span>
        <span className="text-foreground">{evento.descricao}</span>
      </div>

      <form action={formAction} className="grid gap-4 rounded-2xl bg-card shadow-card p-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Input id="descricao" name="descricao" type="text" required defaultValue={evento.descricao} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="valor">Valor total (R$)</Label>
          {evento.valorCategoriaEditavel ? (
            <Input id="valor" name="valor" type="text" inputMode="decimal" required value={valorTexto} onChange={(e) => setValorTexto(e.target.value)} />
          ) : (
            <>
              <input type="hidden" name="valor" value={valorTexto} />
              <p className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                {formatarMoeda(evento.valorTotal)}
              </p>
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>{ehReceita ? "Cliente" : "Fornecedor"} (opcional)</Label>
          <PessoaCombobox
            pessoas={pessoas}
            perfil={ehReceita ? "CLIENTE" : "FORNECEDOR"}
            label={`Selecionar ${ehReceita ? "cliente" : "fornecedor"}...`}
            pessoaInicial={evento.pessoaAtual}
          />
        </div>

        <div className="min-w-0 space-y-1.5 sm:col-span-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={rateioAtivo ? undefined : "categoria_id"}>Categoria</Label>
            {evento.valorCategoriaEditavel && (
              <button
                type="button"
                onClick={() => setRateioAtivo((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {rateioAtivo ? "Usar categoria única" : "Dividir entre categorias"}
                <CaretDown size={12} className={rateioAtivo ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>
            )}
          </div>

          {!evento.valorCategoriaEditavel ? (
            <div className="space-y-2">
              {/* Bloqueado: sem controle interativo, mas o valor atual ainda
                  precisa chegar no formData igual — senão o servidor vê
                  "valor sumiu" e tenta recriar o evento à toa. */}
              <input type="hidden" name="categoria_id" value={evento.categoriaAtual?.id ?? ""} />
              {evento.centroCustoAtual && <input type="hidden" name="centro_custo_id" value={evento.centroCustoAtual.id} />}
              <p className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                {evento.categoriaAtual?.nome ?? "-"}
                {evento.centroCustoAtual && <span className="ml-2 text-xs">· {evento.centroCustoAtual.nome}</span>}
              </p>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <WarningCircle size={14} className="mt-0.5 shrink-0" />
                {evento.motivoBloqueio}
              </p>
            </div>
          ) : rateioAtivo ? (
            <RateioCategorias categorias={categorias} centrosCusto={centrosCusto} valorTotal={valorNumerico} onValidacaoChange={setRateioValido} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <CategoriaCombobox categorias={categorias} categoriaInicial={evento.categoriaAtual} />
              <CentroCustoCombobox centrosCusto={centrosCusto} centroCustoInicial={evento.centroCustoAtual} />
            </div>
          )}
        </div>

        {estado.erro && <p className="text-sm text-destructive sm:col-span-2">{estado.erro}</p>}

        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={pendente || (rateioAtivo && !rateioValido)}>
            {pendente ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href={`/${caminhoBase}`}>Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
