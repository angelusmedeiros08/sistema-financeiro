import { List, SignOut } from "@phosphor-icons/react/dist/ssr";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarConteudo } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { CommandPaletteBusca } from "./command-palette-busca";
import { NovoRegistroMenu } from "./novo-registro-menu";
import { sair } from "@/app/(auth)/actions";

export function Topbar({ tenantNome, email }: { tenantNome: string; email: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:px-8">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <List size={20} />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 border-r-0 bg-sidebar p-0 text-sidebar-foreground [&_button]:text-sidebar-foreground">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SidebarConteudo emSheet />
        </SheetContent>
      </Sheet>

      <span className="hidden shrink-0 font-heading text-[15px] font-bold tracking-tight text-foreground lg:inline">
        Núcleo
      </span>

      <div className="hidden min-w-0 flex-1 justify-center lg:flex">
        <CommandPaletteBusca />
      </div>

      <div className="min-w-0 flex-1 lg:hidden">
        <p className="truncate text-sm font-semibold text-foreground">{tenantNome}</p>
      </div>

      <div className="flex items-center gap-2.5">
        <NovoRegistroMenu />
        <span className="hidden text-sm text-muted-foreground xl:inline">{tenantNome}</span>
        <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
        <ThemeToggle />
        <form action={sair}>
          <Button variant="ghost" size="icon" type="submit" title="Sair">
            <SignOut size={19} />
            <span className="sr-only">Sair</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
