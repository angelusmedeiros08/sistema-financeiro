import Link from "next/link";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { sair } from "@/app/(auth)/actions";

// Shell deliberadamente mais simples que o Topbar+Sidebar do app interno —
// quem entra pelo portal só lê (painel e histórico), não tem formulário de
// criação nem ação de baixa, então não faz sentido mostrar a navegação
// cheia de Despesas/Receitas/Contas a pagar (spec Fase 2 §5).
export function PortalTopbar({ tenantNome, email }: { tenantNome: string; email: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-6 border-b border-border bg-card px-4 lg:px-8">
      <span className="font-heading text-[15px] font-bold tracking-tight text-foreground">{tenantNome}</span>

      <nav className="flex flex-1 gap-1">
        <Link href="/portal" className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          Painel
        </Link>
        <Link href="/portal/lancamentos" className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          Lançamentos
        </Link>
      </nav>

      <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
      <form action={sair}>
        <Button variant="ghost" size="icon" type="submit" title="Sair">
          <SignOut size={19} />
          <span className="sr-only">Sair</span>
        </Button>
      </form>
    </header>
  );
}
