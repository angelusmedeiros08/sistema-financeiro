import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { TabelaParcelasAbertas } from "@/components/lancamentos/tabela-parcelas-abertas";
import { STATUS_VENCIDO, STATUS_VENCE_EM_30, limitesJanelaVencimento } from "@/lib/relatorios/aging";
import type { Database } from "@/utils/supabase/database.types";
import { cn } from "@/lib/utils";
import { TituloPagina } from "@/components/layout/titulo-pagina";

type StatusParcela = Database["public"]["Enums"]["status_parcela"];

// "vencido"/"vence30" replicam o mesmo critério dos cards clicáveis do
// Painel/Relatórios (buscarResumoVencimentos/obterPendentesPorTipo) — quem
// clica em "A pagar vencido" precisa cair exatamente nos registros que
// compuseram aquele total, não numa aproximação.
const FILTROS: { valor: string; rotulo: string; status: StatusParcela[] | null; janela: "vencido" | "vence30" | null }[] = [
  { valor: "aberto", rotulo: "Em aberto", status: ["PENDENTE", "RECEBIDO_PARCIAL", "RENEGOCIADO"], janela: null },
  { valor: "vencido", rotulo: "Vencido", status: [...STATUS_VENCIDO], janela: "vencido" },
  { valor: "vence30", rotulo: "Vence em 30 dias", status: [...STATUS_VENCE_EM_30], janela: "vence30" },
  { valor: "quitados", rotulo: "Quitados", status: ["QUITADO"], janela: null },
  { valor: "cancelados", rotulo: "Cancelados", status: ["CANCELADO"], janela: null },
  { valor: "todos", rotulo: "Todos", status: null, janela: null },
];

const TAMANHO_PAGINA = 20;

export default async function PaginaContasAPagar({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string; pagina?: string; pessoa?: string; vencimento_de?: string; vencimento_ate?: string }>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) {
    redirect("/entrar");
  }
  const { tenantId } = contexto;

  const { situacao, pagina: paginaBruta, pessoa, vencimento_de: vencDe, vencimento_ate: vencAte } = await searchParams;
  const filtro = FILTROS.find((f) => f.valor === (situacao ?? "aberto")) ?? FILTROS[0];
  const pagina = Math.max(1, Number(paginaBruta) || 1);
  const inicio = (pagina - 1) * TAMANHO_PAGINA;

  const supabase = await createClient();

  let query = supabase
    .from("parcelas")
    .select(
      "id, valor, data_vencimento, status, baixas(id, data_pagamento, valor_pago, valor_juros, valor_multa, valor_desconto, valor_taxa, estornado_em), eventos_financeiros!inner(descricao, tipo, pessoas(nome))",
      { count: "exact" },
    )
    .eq("tenant_id", tenantId)
    .eq("eventos_financeiros.tipo", "DESPESA")
    .order("data_vencimento", { ascending: true })
    .range(inicio, inicio + TAMANHO_PAGINA - 1);

  if (pessoa) query = query.eq("eventos_financeiros.pessoa_id", pessoa);
  // `vencimento_de`/`vencimento_ate` (link de faixa do Aging) tem
  // prioridade — mesmo raciocínio de contas-a-receber/page.tsx.
  if (vencDe || vencAte) {
    query = query.in("status", STATUS_VENCIDO);
    if (vencDe) query = query.gte("data_vencimento", vencDe);
    if (vencAte) query = query.lte("data_vencimento", vencAte);
  } else if (pessoa && !situacao) {
    query = query.in("status", STATUS_VENCIDO);
  } else {
    if (filtro.status) query = query.in("status", filtro.status);
    if (filtro.janela === "vencido") {
      query = query.lt("data_vencimento", limitesJanelaVencimento(0).hojeIso);
    } else if (filtro.janela === "vence30") {
      const { hojeIso, limiteIso } = limitesJanelaVencimento(30);
      query = query.gte("data_vencimento", hojeIso).lte("data_vencimento", limiteIso);
    }
  }

  const { data: parcelas, count: totalParcelas } = await query;
  const totalPaginas = Math.max(1, Math.ceil((totalParcelas ?? 0) / TAMANHO_PAGINA));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TituloPagina>Contas a pagar</TituloPagina>
        <div className="flex flex-wrap gap-1">
          {FILTROS.map((f) => (
            <Link
              key={f.valor}
              href={`/contas-a-pagar?situacao=${f.valor}`}
              aria-current={filtro.valor === f.valor ? "true" : undefined}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium",
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
        acaoLote={filtro.valor === "aberto" || filtro.valor === "vencido" || filtro.valor === "vence30"}
        paginacao={{
          pagina,
          totalPaginas,
          totalRegistros: totalParcelas ?? 0,
          tamanhoPagina: TAMANHO_PAGINA,
          hrefBase: (() => {
            const p = new URLSearchParams({ situacao: filtro.valor });
            if (pessoa) p.set("pessoa", pessoa);
            if (vencDe) p.set("vencimento_de", vencDe);
            if (vencAte) p.set("vencimento_ate", vencAte);
            return `/contas-a-pagar?${p.toString()}`;
          })(),
        }}
      />
    </div>
  );
}
