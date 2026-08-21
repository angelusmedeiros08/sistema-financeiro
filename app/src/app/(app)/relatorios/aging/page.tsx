import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarAging, buscarAgingPorParticipante } from "@/lib/relatorios/aging";
import { RelatoriosSubNav } from "../sub-nav";
import { AgingBarras } from "@/components/relatorios/aging-barras";
import { AgingParticipantesTabela } from "@/components/relatorios/aging-participantes-tabela";
import { formatarMoeda, formatarNumeroCompacto } from "@/lib/formatacao";

export default async function PaginaRelatoriosAging() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const [agingReceita, agingDespesa, participantesReceita, participantesDespesa] = await Promise.all([
    buscarAging(supabase, { tenantId: contexto.tenantId, tipo: "RECEITA" }),
    buscarAging(supabase, { tenantId: contexto.tenantId, tipo: "DESPESA" }),
    buscarAgingPorParticipante(supabase, { tenantId: contexto.tenantId, tipo: "RECEITA" }),
    buscarAgingPorParticipante(supabase, { tenantId: contexto.tenantId, tipo: "DESPESA" }),
  ]);

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
      <RelatoriosSubNav />

      <p className="text-sm text-muted-foreground">
        Aging analítico: não usa o seletor de Regime/Granularidade, mostra o saldo em aberto de todas as parcelas
        pendentes hoje, por faixa de vencimento, o mesmo cálculo de <em>Contas a receber</em> e <em>Contas a pagar</em>.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgingBarras titulo="Vencido: a receber" dados={agingReceita} />
        <AgingBarras titulo="Vencido: a pagar" dados={agingDespesa} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FaixasAVencer titulo="A vencer: a receber" dados={agingReceita} cor="#157F6B" />
        <FaixasAVencer titulo="A vencer: a pagar" dados={agingDespesa} cor="#C98A1F" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgingParticipantesTabela titulo="Maiores devedores (a receber)" linhas={participantesReceita} />
        <AgingParticipantesTabela titulo="Maiores credores (a pagar)" linhas={participantesDespesa} />
      </div>
    </div>
  );
}

function FaixasAVencer({
  titulo,
  dados,
  cor,
}: {
  titulo: string;
  dados: Awaited<ReturnType<typeof buscarAging>>;
  cor: string;
}) {
  const faixas = dados.aVencer.filter((f) => f.total > 0);
  const maior = Math.max(...faixas.map((f) => f.total), 1);

  return (
    <div className="rounded-2xl bg-card shadow-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold text-foreground">{titulo}</h2>
        <span className="text-sm font-bold tabular-nums text-foreground">{formatarMoeda(dados.totalAVencer)}</span>
      </div>

      {faixas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada a vencer no horizonte considerado.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {faixas.map((faixa) => (
            <div key={faixa.rotulo} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs text-muted-foreground">{faixa.rotulo}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${Math.max(4, (faixa.total / maior) * 100)}%`, background: cor }} />
              </div>
              <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                {formatarNumeroCompacto(faixa.total)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
