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

const TAMANHO_PAGINA = 20;

export default async function PaginaContasAReceber({
  searchParams,
}: {
  searchParams: Promise<{
    situacao?: string;
    pagina?: string;
    evento?: string;
    pessoa?: string;
    vencimento_de?: string;
    vencimento_ate?: string;
  }>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) {
    redirect("/entrar");
  }
  const { tenantId } = contexto;

  const { situacao, pagina: paginaBruta, evento, pessoa, vencimento_de: vencDe, vencimento_ate: vencAte } = await searchParams;
  // Com `evento` (link "ver a venda gerada" no detalhe da Venda), o padrão
  // vira "todos": a venda pode ter parcela já quitada/cancelada, e quem
  // clicou quer ver TODAS as parcelas desta venda específica, não só as em
  // aberto (achado em auditoria de UX — o link não existia antes).
  const situacaoEfetiva = situacao ?? (evento ? "todos" : "aberto");
  const filtro = FILTROS.find((f) => f.valor === situacaoEfetiva) ?? FILTROS[0];
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
    .eq("eventos_financeiros.tipo", "RECEITA")
    .order("data_vencimento", { ascending: true })
    .range(inicio, inicio + TAMANHO_PAGINA - 1);

  if (evento) query = query.eq("eventos_financeiros.id", evento);
  if (pessoa) query = query.eq("eventos_financeiros.pessoa_id", pessoa);
  // Com `pessoa` (link de "Maiores devedores" em Aging) e nenhuma situação
  // explícita, o status precisa ser EXATAMENTE `STATUS_VENCIDO` (o mesmo
  // conjunto que `buscarAgingPorParticipante` soma como `totalEmAberto`) —
  // não o status de "aberto" (`PENDENTE/RECEBIDO_PARCIAL/RENEGOCIADO`), que
  // diverge nos dois sentidos (inclui RENEGOCIADO que aging não conta, não
  // inclui ATRASADO que aging conta). Achado em revisão de código: hoje os
  // dois batem por acidente (nenhuma parcela tem RENEGOCIADO/ATRASADO na
  // base), mas divergiriam silenciosamente se algum dia existisse uma.
  // `vencimento_de`/`vencimento_ate` (link de faixa do Aging) tem prioridade
  // sobre `pessoa`/situação — mesmo raciocínio do `pessoa` sem situação:
  // status precisa ser EXATAMENTE STATUS_VENCIDO (o que `buscarAging` soma
  // por faixa), não o de "aberto"/"vencido" (que não bate: "aberto" tem
  // RENEGOCIADO a mais, "vencido" tem um corte de data fixo em hoje que uma
  // faixa "a vencer" nunca teria como bater).
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
        acaoLote={filtro.valor === "aberto" || filtro.valor === "vencido" || filtro.valor === "vence30"}
        paginacao={{
          pagina,
          totalPaginas,
          totalRegistros: totalParcelas ?? 0,
          tamanhoPagina: TAMANHO_PAGINA,
          hrefBase: (() => {
            const p = new URLSearchParams({ situacao: filtro.valor });
            if (evento) p.set("evento", evento);
            if (pessoa) p.set("pessoa", pessoa);
            if (vencDe) p.set("vencimento_de", vencDe);
            if (vencAte) p.set("vencimento_ate", vencAte);
            return `/contas-a-receber?${p.toString()}`;
          })(),
        }}
      />
    </div>
  );
}
