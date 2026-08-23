import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { TabelaParcelasAbertas } from "@/components/lancamentos/tabela-parcelas-abertas";
import { cn } from "@/lib/utils";

const FILTROS = [
  { valor: "aberto", rotulo: "Em aberto", status: ["PENDENTE", "RECEBIDO_PARCIAL", "RENEGOCIADO"] },
  { valor: "quitados", rotulo: "Quitados", status: ["QUITADO"] },
  { valor: "cancelados", rotulo: "Cancelados", status: ["CANCELADO"] },
  { valor: "todos", rotulo: "Todos", status: null },
] as const;

export default async function PaginaContasAPagar({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string }>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) {
    redirect("/entrar");
  }
  const { tenantId } = contexto;

  const { situacao = "aberto" } = await searchParams;
  const filtro = FILTROS.find((f) => f.valor === situacao) ?? FILTROS[0];

  const supabase = await createClient();

  let query = supabase
    .from("parcelas")
    .select(
      "id, valor, data_vencimento, status, baixas(id, data_pagamento, valor_pago, valor_juros, valor_multa, valor_desconto, valor_taxa, estornado_em), eventos_financeiros!inner(descricao, tipo, pessoas(nome))",
    )
    .eq("tenant_id", tenantId)
    .eq("eventos_financeiros.tipo", "DESPESA")
    .order("data_vencimento", { ascending: true });

  if (filtro.status) query = query.in("status", filtro.status);

  const { data: parcelas } = await query;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Contas a pagar</h1>
        <div className="flex flex-wrap gap-1">
          {FILTROS.map((f) => (
            <Link
              key={f.valor}
              href={`/contas-a-pagar?situacao=${f.valor}`}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                filtro.valor === f.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {f.rotulo}
            </Link>
          ))}
        </div>
      </div>
      <TabelaParcelasAbertas
        parcelas={parcelas ?? []}
        textoVazio="Nenhuma conta a pagar nessa situação."
        caminhoBase="contas-a-pagar"
      />
    </div>
  );
}
