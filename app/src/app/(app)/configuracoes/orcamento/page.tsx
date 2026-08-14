import { redirect } from "next/navigation";

// Orçamento virou módulo próprio do menu, unificado com Orçado × Realizado
// numa página só com abas — rota antiga preservada como redirect.
export default async function PaginaConfiguracoesOrcamentoRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]);
  p.set("aba", "cadastro");
  redirect(`/orcamento?${p.toString()}`);
}
