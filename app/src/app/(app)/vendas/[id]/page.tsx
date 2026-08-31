import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarVenda } from "@/lib/vendas/vendas";
import { listarProdutosServicos } from "@/lib/produtos-servicos/produtos-servicos";
import { listarPessoasParaCombobox } from "@/lib/pessoas/buscar-pessoa";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarDataIsoParaBR } from "@/lib/importacao/locale-br";
import type { Database } from "@/utils/supabase/database.types";
import { cn } from "@/lib/utils";
import { VendaForm } from "../venda-form";
import { VendaAcoes } from "../venda-acoes";

type StatusVenda = Database["public"]["Enums"]["status_venda"];

function badgeStatus(status: StatusVenda) {
  const mapa: Record<StatusVenda, { rotulo: string; className: string }> = {
    RASCUNHO: { rotulo: "Rascunho", className: "bg-muted text-muted-foreground" },
    APROVADO: { rotulo: "Aprovada", className: "bg-positivo/12 text-positivo-foreground" },
    RECUSADO: { rotulo: "Recusada", className: "bg-destructive/12 text-destructive-foreground" },
  };
  const { rotulo, className } = mapa[status];
  return <Badge variant="outline" className={cn("border-none text-[11px] font-semibold", className)}>{rotulo}</Badge>;
}

export default async function PaginaVenda({ params }: { params: Promise<{ id: string }> }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { id } = await params;
  const supabase = await createClient();
  const venda = await buscarVenda(supabase, contexto.tenantId, id);
  if (!venda) notFound();

  const editavel = venda.status === "RASCUNHO";

  if (editavel) {
    const [pessoas, produtos, formasPagamentoResultado] = await Promise.all([
      listarPessoasParaCombobox(supabase, { tenant_id: contexto.tenantId, perfil: "CLIENTE" }),
      listarProdutosServicos(supabase, contexto.tenantId, { apenasAtivos: true }),
      supabase.from("formas_pagamento").select("id, nome").eq("tenant_id", contexto.tenantId).order("nome"),
    ]);

    const produtosDisponiveis = new Map(produtos.map((p) => [p.id, { id: p.id, nome: p.nome, precoVenda: p.precoVenda }]));
    for (const item of venda.itens) {
      if (!produtosDisponiveis.has(item.produtoServicoId)) {
        produtosDisponiveis.set(item.produtoServicoId, { id: item.produtoServicoId, nome: item.descricao, precoVenda: item.precoUnitario });
      }
    }

    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/vendas" className="text-xs text-muted-foreground hover:text-foreground">
              ← Vendas
            </Link>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Venda #{venda.numero}</h1>
              {badgeStatus(venda.status)}
            </div>
          </div>
          <VendaAcoes vendaId={venda.id} status={venda.status} />
        </div>

        <VendaForm
          modo="editar"
          vendaId={venda.id}
          pessoas={pessoas}
          produtosIniciais={[...produtosDisponiveis.values()]}
          formasPagamento={formasPagamentoResultado.data ?? []}
          vendaInicial={{
            pessoaId: venda.pessoaId,
            pessoaNome: venda.pessoaNome,
            dataEmissao: venda.dataEmissao,
            formaPagamentoId: venda.formaPagamentoId,
            numeroParcelas: venda.numeroParcelas,
            primeiroVencimento: venda.primeiroVencimento,
            observacoes: venda.observacoes,
            itens: venda.itens.map((i) => ({ produtoServicoId: i.produtoServicoId, nome: i.descricao, quantidade: i.quantidade, precoUnitario: i.precoUnitario })),
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/vendas" className="text-xs text-muted-foreground hover:text-foreground">
            ← Vendas
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Venda #{venda.numero}</h1>
            {badgeStatus(venda.status)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card shadow-card p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Cliente</dt>
            <dd className="text-sm font-medium text-foreground">{venda.pessoaNome}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Data</dt>
            <dd className="text-sm font-medium text-foreground">{formatarDataIsoParaBR(venda.dataEmissao)}</dd>
          </div>
          {venda.observacoes && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Observações</dt>
              <dd className="text-sm text-foreground">{venda.observacoes}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-2xl bg-card shadow-card p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Itens</h2>
        <div className="space-y-1.5">
          {venda.itens.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {item.descricao} <span className="text-muted-foreground">× {item.quantidade}</span>
              </span>
              <span className="tabular-nums text-foreground">{formatarMoeda(item.valorTotal)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end border-t border-border pt-2">
          <p className="text-sm font-semibold text-foreground">Total: {formatarMoeda(venda.valorTotal)}</p>
        </div>
      </div>

      {venda.status === "APROVADO" && (
        <p className="text-xs text-muted-foreground">
          Venda aprovada — o lançamento e as parcelas ficam em Contas a Receber. Ajustes (estorno, renegociação, cancelamento) acontecem por lá.
        </p>
      )}
    </div>
  );
}
