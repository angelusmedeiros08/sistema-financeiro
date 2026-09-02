import Link from "next/link";
import { Buildings, Check, List, SignOut, UserCircle } from "@phosphor-icons/react/dist/ssr";
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
import { IconeTransmitir } from "./icone-transmitir";
import { NotificacoesMenu } from "./notificacoes-menu";
import type { NotificacaoItem } from "@/lib/notificacoes/notificacoes";
import { sair } from "@/app/(auth)/actions";
import { trocarTenantAtivo } from "@/lib/tenant/trocar-tenant-actions";

export function Topbar({
  tenantNome,
  tenantId,
  tenantsDisponiveis,
  nome,
  notificacoes,
}: {
  tenantNome: string;
  tenantId: string;
  tenantsDisponiveis: { id: string; nome: string }[];
  nome: string;
  notificacoes: NotificacaoItem[];
}) {
  const outrosTenants = tenantsDisponiveis.filter((t) => t.id !== tenantId);
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

      <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
        <img src="/logo/icone-claro.png" alt="" className="size-7 shrink-0 object-contain dark:hidden" />
        <img src="/logo/icone-escuro.png" alt="" className="hidden size-7 shrink-0 object-contain dark:block" />
        <img src="/logo/texto-claro.png" alt="Finanssi" className="h-7 w-auto dark:hidden" />
        <img src="/logo/texto-escuro.png" alt="Finanssi" className="hidden h-7 w-auto dark:block" />
      </div>

      <div className="hidden min-w-0 flex-1 justify-center lg:flex">
        <CommandPaletteBusca />
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-1.5 lg:hidden">
        <CommandPaletteBusca variante="icone" />
        <p className="truncate text-sm font-semibold text-foreground">{tenantNome}</p>
      </div>

      <div className="flex items-center gap-1.5">
        <IconeTransmitir />
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
              <span className="flex items-center gap-1 truncate text-xs font-normal text-muted-foreground">
                <Buildings size={12} />
                {tenantNome}
              </span>
            </DropdownMenuLabel>

            {outrosTenants.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10.5px] font-bold tracking-wide text-muted-foreground uppercase">
                  Trocar de empresa
                </DropdownMenuLabel>
                <DropdownMenuItem className="gap-2 opacity-100" disabled>
                  <Check size={14} className="text-primary" />
                  <span className="truncate font-medium text-foreground">{tenantNome}</span>
                </DropdownMenuItem>
                {outrosTenants.map((t) => (
                  <form key={t.id} action={trocarTenantAtivo}>
                    <input type="hidden" name="tenant_id" value={t.id} />
                    <DropdownMenuItem asChild>
                      <button type="submit" className="w-full gap-2 pl-[26px] text-left">
                        <span className="truncate">{t.nome}</span>
                      </button>
                    </DropdownMenuItem>
                  </form>
                ))}
              </>
            )}

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
