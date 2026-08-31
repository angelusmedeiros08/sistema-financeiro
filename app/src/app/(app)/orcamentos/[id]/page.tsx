import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarOrcamento } from "@/lib/orcamentos-comerciais/orcamentos-comerciais";
import { listarProdutosServicos } from "@/lib/produtos-servicos/produtos-servicos";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarDataIsoParaBR } from "@/lib/importacao/locale-br";
import { cn } from "@/lib/utils";
import type { Database } from "@/utils/supabase/database.types";
import { OrcamentoForm } from "../orcamento-form";
import { OrcamentoAcoes } from "../orcamento-acoes";

type StatusOrcamentoComercial = Database["public"]["Enums"]["status_orcamento_comercial"];

// Duplicado do mapa em tabela-orcamentos.tsx de propósito — aquele arquivo é
// "use client", e importar um valor não-componente dele pra um Server
// Component quebra em runtime (o import vira uma referência de cliente, não
// o objeto de verdade). Mesmo padrão isolado que vendas/[id]/page.tsx já
// usava antes desta feature (badgeStatus definido localmente ali também).
const MAPA_STATUS_ORCAMENTO: Record<StatusOrcamentoComercial, { rotulo: string; className: string }> = {
  RASCUNHO: { rotulo: "Rascunho", className: "bg-muted text-muted-foreground" },
  ENVIADO: { rotulo: "Enviado", className: "bg-amber-500/12 text-amber-700 dark:text-amber-400" },
  APROVADO: { rotulo: "Aprovado", className: "bg-positivo/12 text-positivo-foreground" },
  RECUSADO: { rotulo: "Recusado", className: "bg-destructive/12 text-destructive-foreground" },
  EXPIRADO: { rotulo: "Expirado", className: "bg-muted text-muted-foreground" },
};

export default async function PaginaOrcamento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();
  const orcamento = await buscarOrcamento(supabase, contexto.tenantId, id);
  if (!orcamento) notFound();

  const editavel = orcamento.status === "RASCUNHO" || orcamento.status === "ENVIADO";

  if (editavel) {
    const [pessoasResultado, produtos, formasPagamentoResultado] = await Promise.all([
      supabase.from("pessoas").select("id, nome").eq("tenant_id", contexto.tenantId).contains("perfis", ["CLIENTE"]).order("nome"),
      listarProdutosServicos(supabase, contexto.tenantId, { apenasAtivos: true }),
      supabase.from("formas_pagamento").select("id, nome").eq("tenant_id", contexto.tenantId).order("nome"),
    ]);

    const produtosDisponiveis = new Map(produtos.map((p) => [p.id, { id: p.id, nome: p.nome, precoVenda: p.precoVenda }]));
    for (const item of orcamento.itens) {
      if (!produtosDisponiveis.has(item.produtoServicoId)) {
        produtosDisponiveis.set(item.produtoServicoId, { id: item.produtoServicoId, nome: item.descricao, precoVenda: item.precoUnitario });
      }
    }

    const { rotulo, className } = MAPA_STATUS_ORCAMENTO[orcamento.status];

    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/orcamentos" className="text-xs text-muted-foreground hover:text-foreground">
              ← Orçamentos
            </Link>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Orçamento #{orcamento.numero}</h1>
              <Badge variant="outline" className={cn("border-none text-[11px] font-semibold", className)}>
                {rotulo}
              </Badge>
              {orcamento.status === "ENVIADO" && orcamento.validade && (
                <span className="text-xs text-muted-foreground">válido até {formatarDataIsoParaBR(orcamento.validade)}</span>
              )}
            </div>
          </div>
          <OrcamentoAcoes orcamentoId={orcamento.id} status={orcamento.status} />
        </div>

        {erro && (
          <p className="rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
            O orçamento foi salvo, mas não foi possível enviar: {erro}
          </p>
        )}

        <OrcamentoForm
          modo="editar"
          orcamentoId={orcamento.id}
          pessoas={pessoasResultado.data ?? []}
          produtosIniciais={[...produtosDisponiveis.values()]}
          formasPagamento={formasPagamentoResultado.data ?? []}
          orcamentoInicial={{
            pessoaId: orcamento.pessoaId,
            pessoaNome: orcamento.pessoaNome,
            dataEmissao: orcamento.dataEmissao,
            formaPagamentoId: orcamento.formaPagamentoId,
            numeroParcelas: orcamento.numeroParcelas,
            primeiroVencimento: orcamento.primeiroVencimento,
            observacoes: orcamento.observacoes,
            itens: orcamento.itens.map((i) => ({ produtoServicoId: i.produtoServicoId, nome: i.descricao, quantidade: i.quantidade, precoUnitario: i.precoUnitario })),
          }}
        />
      </div>
    );
  }

  const { rotulo, className } = MAPA_STATUS_ORCAMENTO[orcamento.status];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/orcamentos" className="text-xs text-muted-foreground hover:text-foreground">
            ← Orçamentos
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Orçamento #{orcamento.numero}</h1>
            <Badge variant="outline" className={cn("border-none text-[11px] font-semibold", className)}>
              {rotulo}
            </Badge>
          </div>
        </div>
        <OrcamentoAcoes orcamentoId={orcamento.id} status={orcamento.status} />
      </div>

      <div className="rounded-2xl bg-card shadow-card p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Cliente</dt>
            <dd className="text-sm font-medium text-foreground">{orcamento.pessoaNome}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Data</dt>
            <dd className="text-sm font-medium text-foreground">{formatarDataIsoParaBR(orcamento.dataEmissao)}</dd>
          </div>
          {orcamento.validade && (
            <div>
              <dt className="text-xs text-muted-foreground">Validade</dt>
              <dd className="text-sm font-medium text-foreground">{formatarDataIsoParaBR(orcamento.validade)}</dd>
            </div>
          )}
          {orcamento.status === "RECUSADO" && orcamento.motivoRecusa && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Motivo da recusa</dt>
              <dd className="text-sm text-foreground italic">&quot;{orcamento.motivoRecusa}&quot;</dd>
            </div>
          )}
          {orcamento.observacoes && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Observações</dt>
              <dd className="text-sm text-foreground">{orcamento.observacoes}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-2xl bg-card shadow-card p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Itens</h2>
        <div className="space-y-1.5">
          {orcamento.itens.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {item.descricao} <span className="text-muted-foreground">× {item.quantidade}</span>
              </span>
              <span className="tabular-nums text-foreground">{formatarMoeda(item.valorTotal)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end border-t border-border pt-2">
          <p className="text-sm font-semibold text-foreground">Total: {formatarMoeda(orcamento.valorTotal)}</p>
        </div>
      </div>

      {orcamento.status === "APROVADO" && orcamento.vendaGeradaId && (
        <p className="text-xs text-muted-foreground">
          Orçamento aprovado —{" "}
          <Link href={`/vendas/${orcamento.vendaGeradaId}`} className="font-medium text-foreground underline underline-offset-2">
            ver a venda gerada
          </Link>
          .
        </p>
      )}
    </div>
  );
}
