import Link from "next/link";
import { List, SignOut, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarConteudo } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { CommandPaletteBusca } from "./command-palette-busca";
import { NovoRegistroMenu } from "./novo-registro-menu";
import { NotificacoesMenu, type NotificacaoAlerta } from "./notificacoes-menu";
import { sair } from "@/app/(auth)/actions";

export function Topbar({
  tenantNome,
  nome,
  notificacoes,
}: {
  tenantNome: string;
  nome: string;
  notificacoes: NotificacaoAlerta[];
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:px-8">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <List size={20} />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
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

      <div className="flex items-center gap-1.5">
        <NovoRegistroMenu />
        <NotificacoesMenu notificacoes={notificacoes} />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D8583A] to-[#A87C1F] text-sm font-bold text-white transition-opacity hover:opacity-90"
              title={nome}
            >
              {nome.charAt(0).toUpperCase()}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate font-semibold text-foreground">{nome}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">{tenantNome}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/perfil" className="gap-2">
                <UserCircle size={15} />
                Ver perfil
              </Link>
            </DropdownMenuItem>
            <form action={sair}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full gap-2 text-left">
                  <SignOut size={15} />
                  Sair
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
