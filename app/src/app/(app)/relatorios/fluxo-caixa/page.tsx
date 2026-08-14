import { redirect } from "next/navigation";

// Fluxo de Caixa subiu a nível de módulo do menu (item de primeiro nível,
// não mais sub-item de Relatórios) — rota antiga preservada como redirect
// pra não quebrar link salvo/histórico do navegador.
export default async function PaginaRelatoriosFluxoCaixaRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const query = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]).toString();
  redirect(query ? `/fluxo-caixa?${query}` : "/fluxo-caixa");
}
