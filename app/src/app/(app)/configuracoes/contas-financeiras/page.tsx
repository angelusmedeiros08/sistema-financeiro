import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarContasBancarias } from "@/lib/relatorios/contas-bancarias";
import { buscarResumoVencimentos } from "@/lib/relatorios/aging";
import { ConfiguracoesSubNav } from "../sub-nav";
import { NovaContaFinanceiraForm } from "./nova-conta-form";
import { ToggleAtivoContaButton } from "./toggle-ativo-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/painel/stat-card";
import { formatarMoeda } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

const ABAS = [
  { valor: "contas", rotulo: "Contas" },
  { valor: "visao-geral", rotulo: "Visão geral" },
] as const;

const ROTULO_TIPO: Record<string, string> = {
  BANCO: "Conta bancária",
  CAIXA: "Caixa",
  CARTEIRA_DIGITAL: "Carteira digital",
};

export default async function PaginaContasFinanceiras({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { aba = "contas" } = await searchParams;
  const supabase = await createClient();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Contas financeiras</h1>
      <ConfiguracoesSubNav />

      <div className="flex gap-1">
        {ABAS.map((a) => (
          <Link
            key={a.valor}
            href={`/configuracoes/contas-financeiras?aba=${a.valor}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              aba === a.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {a.rotulo}
          </Link>
        ))}
      </div>

      {aba === "visao-geral" ? (
        <VisaoGeralContasFinanceiras tenantId={contexto.tenantId} supabase={supabase} />
      ) : (
        <AbaContas tenantId={contexto.tenantId} supabase={supabase} />
      )}
    </div>
  );
}

async function AbaContas({ tenantId, supabase }: { tenantId: string; supabase: Awaited<ReturnType<typeof createClient>> }) {
  const { data: contas } = await supabase
    .from("contas_financeiras")
    .select("id, nome, tipo, banco, saldo_inicial, ativo")
    .eq("tenant_id", tenantId)
    .order("nome");

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Nova conta</h2>
        <NovaContaFinanceiraForm />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Cadastradas</h2>

        {!contas || contas.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma conta financeira cadastrada ainda.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead className="text-right">Saldo inicial</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">{c.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{ROTULO_TIPO[c.tipo ?? ""] ?? c.tipo ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.banco ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatarMoeda(Number(c.saldo_inicial))}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-none font-semibold", c.ativo ? "bg-[#157F6B]/12 text-[#0F5F50]" : "bg-muted text-muted-foreground")}>
                        {c.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ToggleAtivoContaButton id={c.id} ativo={c.ativo} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

// Reaproveita buscarContasBancarias (mesma leitura do relatório Contas
// Bancárias) numa janela fixa de 30 dias — a Visão geral aqui é um resumo
// de configuração, não precisa do seletor de Regime/Granularidade da seção
// de Relatórios.
async function VisaoGeralContasFinanceiras({ tenantId, supabase }: { tenantId: string; supabase: Awaited<ReturnType<typeof createClient>> }) {
  const hoje = new Date();
  const dataFim = hoje.toISOString().slice(0, 10);
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - 30);
  const dataInicio = inicio.toISOString().slice(0, 10);

  const [contas, resumoReceber, resumoPagar] = await Promise.all([
    buscarContasBancarias(supabase, { tenantId, regime: "competencia", dataInicio, dataFim }),
    buscarResumoVencimentos(supabase, { tenantId, tipo: "RECEITA" }),
    buscarResumoVencimentos(supabase, { tenantId, tipo: "DESPESA" }),
  ]);

  const saldoTotal = contas.reduce((soma, c) => soma + c.saldoAcumulado, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard variant="hero" label="Saldo total" valor={formatarMoeda(saldoTotal)} />
        <StatCard
          variant="teal"
          label="A receber vencido"
          valor={formatarMoeda(resumoReceber.vencidoTotal)}
          detalhe={`Vence hoje: ${formatarMoeda(resumoReceber.venceHojeTotal)} · Este mês: ${formatarMoeda(resumoReceber.venceEsteMesTotal)}`}
        />
        <StatCard
          variant="ambar"
          label="A pagar vencido"
          valor={formatarMoeda(resumoPagar.vencidoTotal)}
          detalhe={`Vence hoje: ${formatarMoeda(resumoPagar.venceHojeTotal)}`}
        />
      </div>

      {contas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma conta financeira ativa.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {contas.map((c) => (
            <div key={c.contaFinanceiraId} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-heading text-sm font-bold text-foreground">{c.nome}</h2>
                <span className="text-lg font-bold tabular-nums text-foreground">{formatarMoeda(c.saldoAcumulado)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Crédito</p>
                  <p className="font-semibold tabular-nums text-[#157F6B]">{formatarMoeda(c.credito)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Débito</p>
                  <p className="font-semibold tabular-nums text-[#D8583A]">{formatarMoeda(c.debito)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
