import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarImportacao, contarItensAtivos } from "@/lib/importacoes/importacoes";
import { BannerDesfeita } from "./banner-desfeita";
import { FluxoDesfazerPessoas } from "./fluxo-desfazer-pessoas";
import { FluxoDesfazerFinanceiro } from "./fluxo-desfazer-financeiro";

// Tela dedicada (spec 2026-09-01-refino-modulo-importacao-design.md) —
// antes o "Desfazer importação" era um card apertado disputando espaço
// com RetomarPainel na página de detalhe. `jaFoiDesfeita` decide entre o
// banner permanente (Estado 5, estático, sem Client Component) e o fluxo
// de confirmação de verdade (Estados 1-4) — a mesma condição que a página
// de detalhe usa pra decidir se mostra o link de ação ou o status
// compacto, então nunca ficam dessincronizadas.
export default async function PaginaDesfazerImportacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const resultado = await buscarImportacao(supabase, { tenant_id: contexto.tenantId, importacao_id: id });
  if (!resultado) notFound();

  const { importacao, itens } = resultado;
  const itensCriadosSucesso = itens.filter((it) => it.acao === "criar" && it.status === "sucesso");
  const jaFoiDesfeita = itensCriadosSucesso.length > 0 && contarItensAtivos(itens) === 0;

  let quandoDesfez: string | null = null;
  let porNome: string | null = null;
  if (jaFoiDesfeita) {
    const itemDesfeito = itensCriadosSucesso.find((it) => it.desfeitoEm);
    quandoDesfez = itemDesfeito?.desfeitoEm ?? null;
    if (itemDesfeito?.desfeitoPor) {
      const { data: usuario } = await supabase.from("usuarios").select("nome").eq("id", itemDesfeito.desfeitoPor).maybeSingle();
      porNome = usuario?.nome ?? null;
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/importacao/historico/${importacao.id}`} className="text-xs font-medium text-muted-foreground hover:text-foreground">
          ← {importacao.nomeArquivo}
        </Link>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">Desfazer importação</h1>
        <p className="mt-1 text-sm text-muted-foreground">Reverte tudo que este lote criou — cadastros, lançamentos e baixas vinculadas.</p>
      </div>

      <div className="rounded-2xl bg-card shadow-card p-5">
        {jaFoiDesfeita && quandoDesfez ? (
          <BannerDesfeita agora={false} quando={quandoDesfez} porNome={porNome} />
        ) : importacao.tipo === "financeiro" ? (
          <FluxoDesfazerFinanceiro importacaoId={importacao.id} />
        ) : importacao.tipo === "pessoas" ? (
          <FluxoDesfazerPessoas importacaoId={importacao.id} />
        ) : (
          notFound()
        )}
      </div>
    </div>
  );
}
