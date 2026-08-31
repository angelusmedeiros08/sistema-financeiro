"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PessoaCombobox } from "./pessoa-combobox";
import { ProdutoServicoCombobox } from "./produto-servico-combobox";
import { formatarMoeda, parseNumeroBR } from "@/lib/formatacao";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

export type ProdutoOpcaoComercial = { id: string; nome: string; precoVenda: number };

export type LinhaItemComercial = { produtoServicoId: string; nome: string; quantidade: number; precoUnitario: number };

export type DadosComerciaisIniciais = {
  pessoaId: string;
  pessoaNome: string;
  dataEmissao: string;
  formaPagamentoId: string | null;
  numeroParcelas: number;
  primeiroVencimento: string | null;
  observacoes: string | null;
  itens: LinhaItemComercial[];
};

type ResultadoAcaoComercial = { erro: string } | { sucesso: true };

const estadoInicial = { erro: "" };

function novaLinha(): LinhaItemComercial {
  return { produtoServicoId: "", nome: "", quantidade: 1, precoUnitario: 0 };
}

function formatarNumero(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

// Formulário de cabeçalho + itens compartilhado entre Vendas e Orçamento
// comercial — extraído em revisão de código: VendaForm e OrcamentoForm eram
// cópias quase idênticas (mesmos tipos, mesmo grid de itens, mesma lógica
// de estado), só trocando o texto do título da seção e o botão secundário
// do modo "criar" (Vendas confirma a venda na hora, Orçamento salva e
// envia por e-mail). Todo o resto — inclusive a chamada ao servidor — cada
// domínio injeta via prop, o componente aqui não sabe se está lidando com
// venda ou orçamento.
export function DocumentoComercialForm({
  tituloSecaoDados,
  modo,
  idDocumento,
  pessoas,
  produtosIniciais,
  formasPagamento,
  dadosIniciais,
  acaoCriar,
  acaoEditar,
  botaoCriarSecundario,
  mensagemSucesso,
}: {
  tituloSecaoDados: string;
  modo: "criar" | "editar";
  idDocumento?: string;
  pessoas: { id: string; nome: string }[];
  produtosIniciais: ProdutoOpcaoComercial[];
  formasPagamento: { id: string; nome: string }[];
  dadosIniciais?: DadosComerciaisIniciais;
  acaoCriar: (formData: FormData) => Promise<ResultadoAcaoComercial | undefined>;
  acaoEditar: (id: string, formData: FormData) => Promise<ResultadoAcaoComercial>;
  /** Botão do modo "criar" além de "Salvar rascunho" (idêntico nos dois domínios) — cada chamador define o que a criação direta significa. */
  botaoCriarSecundario: { valorAcao: string; rotulo: string; rotuloPendente: string };
  /** Toast de sucesso — quando `acaoCriar` redireciona (venda direta, orçamento enviado), esse código nunca roda: a Promise não resolve pro cliente, a navegação já é a confirmação (spec de feedback, Seção 4). */
  mensagemSucesso: string;
}) {
  const [produtos, setProdutos] = useState<ProdutoOpcaoComercial[]>(produtosIniciais);
  const [itens, setItens] = useState<LinhaItemComercial[]>(() => (dadosIniciais?.itens.length ? dadosIniciais.itens : [novaLinha()]));
  const dataEmissaoInicial = dadosIniciais?.dataEmissao ?? new Date().toISOString().slice(0, 10);

  const [, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    formData.set(
      "itens_json",
      JSON.stringify(itens.map((i) => ({ produtoServicoId: i.produtoServicoId, quantidade: i.quantidade, precoUnitario: i.precoUnitario }))),
    );

    const resultado = modo === "criar" ? await acaoCriar(formData) : await acaoEditar(idDocumento!, formData);
    notificarResultado(resultado, mensagemSucesso);

    if (resultado && "erro" in resultado) return { erro: resultado.erro };
    return { erro: "" };
  }, estadoInicial);

  function atualizarLinha(indice: number, mudanca: Partial<LinhaItemComercial>) {
    setItens((atual) => atual.map((l, i) => (i === indice ? { ...l, ...mudanca } : l)));
  }

  function escolherProduto(indice: number, produtoServicoId: string, produto: ProdutoOpcaoComercial) {
    atualizarLinha(indice, { produtoServicoId, nome: produto.nome, precoUnitario: produto.precoVenda });
  }

  function registrarProdutoNovo(produto: ProdutoOpcaoComercial) {
    setProdutos((atual) => [...atual, produto]);
  }

  function adicionarLinha() {
    setItens((atual) => [...atual, novaLinha()]);
  }

  function removerLinha(indice: number) {
    setItens((atual) => atual.filter((_, i) => i !== indice));
  }

  const total = itens.reduce((acc, i) => acc + i.quantidade * i.precoUnitario, 0);
  const itensValidos = itens.length > 0 && itens.every((i) => i.produtoServicoId && i.quantidade > 0 && i.precoUnitario >= 0);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="rounded-2xl bg-card shadow-card p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{tituloSecaoDados}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-2">
            <Label>Cliente</Label>
            <PessoaCombobox
              pessoas={pessoas}
              perfil="CLIENTE"
              label="Cliente..."
              pessoaInicial={dadosIniciais ? { id: dadosIniciais.pessoaId, nome: dadosIniciais.pessoaNome } : null}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="data_emissao">Data</Label>
            <Input id="data_emissao" name="data_emissao" type="date" required defaultValue={dataEmissaoInicial} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="forma_pagamento_id">Forma de pagamento</Label>
            <Select name="forma_pagamento_id" defaultValue={dadosIniciais?.formaPagamentoId ?? undefined}>
              <SelectTrigger id="forma_pagamento_id" className="w-full">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {formasPagamento.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="numero_parcelas">Parcelas</Label>
            <Input
              id="numero_parcelas"
              name="numero_parcelas"
              type="number"
              min={1}
              required
              defaultValue={dadosIniciais?.numeroParcelas ?? 1}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primeiro_vencimento">Primeiro vencimento</Label>
            <Input
              id="primeiro_vencimento"
              name="primeiro_vencimento"
              type="date"
              required
              defaultValue={dadosIniciais?.primeiroVencimento ?? dataEmissaoInicial}
            />
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea id="observacoes" name="observacoes" rows={1} defaultValue={dadosIniciais?.observacoes ?? ""} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card shadow-card p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Itens</h2>
        <div className="space-y-2 overflow-x-auto">
          {itens.map((item, indice) => (
            <div key={indice} className="grid min-w-[540px] grid-cols-[1fr_84px_100px_100px_auto] items-center gap-2">
              <ProdutoServicoCombobox
                produtos={produtos}
                value={item.produtoServicoId}
                onChange={(id, produto) => escolherProduto(indice, id, produto)}
                onCriado={registrarProdutoNovo}
              />
              <Input
                type="text"
                inputMode="decimal"
                value={formatarNumero(item.quantidade)}
                onChange={(e) => atualizarLinha(indice, { quantidade: parseNumeroBR(e.target.value) })}
                aria-label="Quantidade"
              />
              <Input
                type="text"
                inputMode="decimal"
                value={formatarNumero(item.precoUnitario)}
                onChange={(e) => atualizarLinha(indice, { precoUnitario: parseNumeroBR(e.target.value) })}
                aria-label="Preço unitário"
              />
              <span className="text-right text-sm tabular-nums text-foreground">{formatarMoeda(item.quantidade * item.precoUnitario)}</span>
              <Button type="button" variant="ghost" size="icon" disabled={itens.length <= 1} onClick={() => removerLinha(indice)}>
                <X size={15} />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={adicionarLinha}>
            <Plus size={13} />
            Adicionar item
          </Button>
          <p className="text-sm font-semibold text-foreground">Total: {formatarMoeda(total)}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {modo === "editar" ? (
          <Button type="submit" disabled={pendente || !itensValidos}>
            {pendente ? "Salvando..." : "Salvar alterações"}
          </Button>
        ) : (
          <>
            <Button type="submit" name="acao" value="rascunho" variant="outline" disabled={pendente || !itensValidos}>
              Salvar rascunho
            </Button>
            <Button type="submit" name="acao" value={botaoCriarSecundario.valorAcao} disabled={pendente || !itensValidos}>
              {pendente ? botaoCriarSecundario.rotuloPendente : botaoCriarSecundario.rotulo}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
