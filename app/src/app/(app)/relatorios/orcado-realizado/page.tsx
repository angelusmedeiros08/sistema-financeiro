import { redirect } from "next/navigation";

// Orçado × Realizado virou aba do módulo de Orçamento (item de primeiro
// nível do menu) — rota antiga preservada como redirect.
export default async function PaginaRelatoriosOrcadoRealizadoRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]);
  p.set("aba", "comparativo");
  redirect(`/orcamento?${p.toString()}`);
}
