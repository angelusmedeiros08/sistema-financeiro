import Link from "next/link";
import { UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

// Mesmo padrão de "empty state como pitch de produto" já usado em
// Receitas/Despesas/Painel pro import financeiro.
export function CtaImportarPessoas({ rotulo }: { rotulo: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
      <p className="text-sm font-medium text-foreground">Nenhum {rotulo} cadastrado ainda.</p>
      <p className="max-w-sm text-sm text-muted-foreground">Cadastre manualmente pelo botão acima ou importe sua planilha de contatos de uma vez.</p>
      <Button asChild size="sm" className="gap-1.5">
        <Link href="/importacao/pessoas">
          <UploadSimple size={14} />
          Importar planilha
        </Link>
      </Button>
    </div>
  );
}
