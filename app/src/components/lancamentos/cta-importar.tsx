import Link from "next/link";
import { UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

// "Empty state como pitch de produto" (Seção 10 da spec de importação) — só
// aparece quando o tenant não tem nenhum evento financeiro em lugar nenhum,
// nunca quando só a lista filtrada da página atual está vazia.
export function CtaImportarPlanilha() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
      <p className="text-sm font-medium text-foreground">Nenhum lançamento ainda.</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Cadastre manualmente pelo formulário acima ou traga de uma vez o histórico que você já mantém numa planilha.
      </p>
      <Button asChild size="sm" className="gap-1.5">
        <Link href="/importacao/planilha">
          <UploadSimple size={14} />
          Importar planilha
        </Link>
      </Button>
    </div>
  );
}
