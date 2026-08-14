import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarGradeOrcamento } from "@/lib/orcamento/orcamento";
import { ConfiguracoesSubNav } from "../sub-nav";
import { GradeOrcamento } from "./grade-orcamento";

export default async function PaginaConfiguracoesOrcamento({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const sp = await searchParams;
  const ano = Number(sp.ano) || new Date().getFullYear();

  const supabase = await createClient();
  const linhas = await buscarGradeOrcamento(supabase, { tenantId: contexto.tenantId, ano });

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Orçamento</h1>
      <ConfiguracoesSubNav />

      <p className="text-sm text-muted-foreground">
        Meta de valor previsto por categoria, mês a mês — casada contra o realizado em{" "}
        <Link href="/relatorios/orcado-realizado" className="font-semibold text-primary hover:underline">
          Relatórios → Orçado × Realizado
        </Link>
        . Cada célula salva sozinha ao sair do campo.
      </p>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <span className="text-xs font-semibold text-muted-foreground">Ano</span>
        <Link href={`/configuracoes/orcamento?ano=${ano - 1}`} className="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">
          ‹
        </Link>
        <span className="text-sm font-bold tabular-nums text-foreground">{ano}</span>
        <Link href={`/configuracoes/orcamento?ano=${ano + 1}`} className="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">
          ›
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
        ) : (
          <GradeOrcamento ano={ano} linhas={linhas} />
        )}
      </div>
    </div>
  );
}
