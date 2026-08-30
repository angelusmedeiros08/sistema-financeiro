import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarDFCMatriz, buscarComposicaoFluxoCaixa } from "@/lib/relatorios/dfc";
import { RelatoriosSubNav } from "../sub-nav";
import { DfcControles } from "./dfc-controles";
import { emModoApresentacao } from "@/lib/apresentacao/sessao";
import { ComposicaoFluxoCaixa } from "@/components/relatorios/composicao-fluxo-caixa";
import { DfcMatrizTabela } from "@/components/relatorios/dfc-matriz-tabela";
import { hojeIsoBrasil } from "@/lib/data-brasil";

export default async function PaginaRelatoriosDfc({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const ano = Number(sp.ano) || Number(hojeIsoBrasil().slice(0, 4));
  const emApresentacao = emModoApresentacao(sp);
  const foco = sp.foco;

  const supabase = await createClient();
  const [linhas, composicaoFluxo] = await Promise.all([
    buscarDFCMatriz(supabase, { tenantId: contexto.tenantId, ano }),
    buscarComposicaoFluxoCaixa(supabase, { tenantId: contexto.tenantId, ano }),
  ]);

  const secaoComposicao = (
    <div className="rounded-2xl bg-card shadow-card p-6">
      <div className="mb-4">
        <h2 className="font-heading text-base font-bold text-foreground">Composição do fluxo de caixa realizado</h2>
        <p className="text-xs text-muted-foreground">De onde a receita veio e pra onde ela foi no ano — o que a matriz abaixo, por atividade, não mostra.</p>
      </div>
      <ComposicaoFluxoCaixa dados={composicaoFluxo} />
    </div>
  );

  const secaoMatriz = (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Previsto (vencimento) × Realizado (pagamento) por mês, nas atividades Operacional, Investimento e Financiamento. Reclassifique linhas da DRE
        em Configurações → Estrutura de DRE.
      </p>
      <DfcMatrizTabela linhas={linhas} ano={ano} />
    </div>
  );

  if (emApresentacao && foco) {
    const secoesPorFoco: Record<string, React.ReactNode> = { composicao: secaoComposicao, matriz: secaoMatriz };
    return <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center">{secoesPorFoco[foco] ?? null}</div>;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Relatórios</h1>
        {!emApresentacao && (
          <Link href="/configuracoes/estrutura-dre" className="text-xs font-semibold text-primary hover:underline">
            Configurar estrutura da DRE
          </Link>
        )}
      </div>

      <RelatoriosSubNav />

      <DfcControles ano={ano} />

      {secaoComposicao}
      {secaoMatriz}
    </div>
  );
}
