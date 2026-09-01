import { SkeletonTable } from "@/components/ui/skeleton-table";

// Página raiz de Configurações redireciona pro primeiro item da lista
// (Centros de custo hoje) — o loading aparece brevemente no meio do
// redirect, mesmo formato compacto das outras subtelas.
export default function CarregandoConfiguracoes() {
  return <SkeletonTable colunas={3} linhas={4} />;
}
