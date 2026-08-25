import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { TabelaParcelasAbertas } from "@/components/lancamentos/tabela-parcelas-abertas";
import { STATUS_VENCIDO, STATUS_VENCE_EM_30, limitesJanelaVencimento } from "@/lib/relatorios/aging";
import type { Database } from "@/utils/supabase/database.types";
import { cn } from "@/lib/utils";

type StatusParcela = Database["public"]["Enums"]["status_parcela"];

// "vencido"/"vence30" replicam o mesmo critério dos cards clicáveis do
// Painel/Relatórios (buscarResumoVencimentos/obterPendentesPorTipo) — quem
// clica em "A receber vencido" precisa cair exatamente nos registros que
// compuseram aquele total, não numa aproximação.
const FILTROS: { valor: string; rotulo: string; status: StatusParcela[] | null; janela: "vencido" | "vence30" | null }[] = [
  { valor: "aberto", rotulo: "Em aberto", status: ["PENDENTE", "RECEBIDO_PARCIAL", "RENEGOCIADO"], janela: null },
  { valor: "vencido", rotulo: "Vencido", status: [...STATUS_VENCIDO], janela: "vencido" },
  { valor: "vence30", rotulo: "Vence em 30 dias", status: [...STATUS_VENCE_EM_30], janela: "vence30" },
  { valor: "quitados", rotulo: "Quitados", status: ["QUITADO"], janela: null },
  { valor: "cancelados", rotulo: "Cancelados", status: ["CANCELADO"], janela: null },
  { valor: "todos", rotulo: "Todos", status: null, janela: null },
];

export default async function PaginaContasAReceber({
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
    .eq("eventos_financeiros.tipo", "RECEITA")
    .order("data_vencimento", { ascending: true });

  if (filtro.status) query = query.in("status", filtro.status);
  if (filtro.janela === "vencido") {
    query = query.lt("data_vencimento", limitesJanelaVencimento(0).hojeIso);
  } else if (filtro.janela === "vence30") {
    const { hojeIso, limiteIso } = limitesJanelaVencimento(30);
    query = query.gte("data_vencimento", hojeIso).lte("data_vencimento", limiteIso);
  }

  const { data: parcelas } = await query;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Contas a receber</h1>
        <div className="flex flex-wrap gap-1">
          {FILTROS.map((f) => (
            <Link
              key={f.valor}
              href={`/contas-a-receber?situacao=${f.valor}`}
              aria-current={filtro.valor === f.valor ? "true" : undefined}
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
        textoVazio="Nenhuma conta a receber nessa situação."
        caminhoBase="contas-a-receber"
      />
    </div>
  );
}
