import { redirect } from "next/navigation";

// Orçado × Realizado virou aba "Previsto × Realizado" do módulo
// Previsionamento (item de primeiro nível do menu, renomeado de "Orçamento"
// em 30/08/2026 — ver docs/superpowers/specs/2026-08-30-previsionamento-
// orcamento-comercial-design.md) — rota antiga preservada como redirect, no
// caminho antigo de propósito (é só pra quem tem esse link salvo de antes).
export default async function PaginaRelatoriosOrcadoRealizadoRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]);
  p.set("aba", "comparativo");
  redirect(`/previsionamento?${p.toString()}`);
}
