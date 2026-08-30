import { redirect } from "next/navigation";

// Orçamento virou módulo próprio do menu ("Previsionamento", desde
// 30/08/2026 — ver docs/superpowers/specs/2026-08-30-previsionamento-
// orcamento-comercial-design.md), unificado com Previsto × Realizado numa
// página só com abas — rota antiga preservada como redirect, no caminho
// antigo de propósito (é só pra quem tem esse link salvo de antes).
export default async function PaginaConfiguracoesOrcamentoRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]);
  p.set("aba", "cadastro");
  redirect(`/previsionamento?${p.toString()}`);
}
