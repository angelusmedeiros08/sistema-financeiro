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
import { parseNumeroBR } from "@/lib/formatacao";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

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
  const valorNumerico = parseNumeroBR(valorTexto);

  const [, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await acao(formData);
    notificarResultado(resultado, ehReceita ? "Receita atualizada." : "Despesa atualizada.");
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
            // readOnly em vez de "hidden + <p>": continua um input de
            // verdade, alcançável por Tab, com o rótulo acima já associado
            // via htmlFor/id — e ainda carrega o valor no submit sozinho,
            // sem precisar de um input escondido à parte.
            <Input
              id="valor"
              name="valor"
              type="text"
              readOnly
              // Mesmo formato de valorTexto (não formatarMoeda) — é o valor
              // que vai literal pro FormData no submit, precisa continuar
              // parseável como número no servidor.
              value={valorTexto}
              aria-describedby={evento.motivoBloqueio ? "categoria-motivo-bloqueio" : undefined}
              className="bg-muted/40 text-muted-foreground"
            />
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
            <Label htmlFor={!evento.valorCategoriaEditavel ? "categoria_exibicao" : rateioAtivo ? undefined : "categoria_id"}>Categoria</Label>
            {evento.valorCategoriaEditavel && (
              <button
                type="button"
                onClick={() => setRateioAtivo((v) => !v)}
                aria-expanded={rateioAtivo}
                aria-controls="categoria-secao"
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {rateioAtivo ? "Usar categoria única" : "Dividir entre categorias"}
                <CaretDown size={12} className={rateioAtivo ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>
            )}
          </div>

          <div id="categoria-secao">
            {!evento.valorCategoriaEditavel ? (
              <div className="space-y-2">
                {/* Bloqueado: sem controle interativo, mas o valor atual ainda
                    precisa chegar no formData igual — senão o servidor vê
                    "valor sumiu" e tenta recriar o evento à toa. */}
                <input type="hidden" name="categoria_id" value={evento.categoriaAtual?.id ?? ""} />
                {evento.centroCustoAtual && <input type="hidden" name="centro_custo_id" value={evento.centroCustoAtual.id} />}
                {/* readOnly em vez de <p>: fica alcançável por Tab, com
                    rótulo "Categoria" associado por id, e aria-describedby
                    liga direto na explicação do bloqueio. */}
                <Input
                  id="categoria_exibicao"
                  type="text"
                  readOnly
                  value={evento.categoriaAtual?.nome ?? "-"}
                  aria-describedby="categoria-motivo-bloqueio"
                  className="bg-muted/40 text-muted-foreground"
                />
                {evento.centroCustoAtual && <p className="text-xs text-muted-foreground">Centro de custo: {evento.centroCustoAtual.nome}</p>}
                <p id="categoria-motivo-bloqueio" className="flex items-start gap-1.5 text-xs text-muted-foreground">
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
        </div>

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
