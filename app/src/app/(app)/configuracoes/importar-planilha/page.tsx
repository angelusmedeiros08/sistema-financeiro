import { redirect } from "next/navigation";

// Import de lançamentos financeiros subiu pro módulo de topo "Importação"
// (não mais sub-item de Configurações) — rota antiga preservada como
// redirect pra não quebrar link salvo/histórico do navegador.
export default async function PaginaConfiguracoesImportarPlanilhaRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const query = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]).toString();
  redirect(query ? `/importacao/planilha?${query}` : "/importacao/planilha");
}
