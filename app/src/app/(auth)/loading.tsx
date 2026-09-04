import { Skeleton } from "@/components/ui/skeleton";

// Cobre as 9 rotas de autenticação de uma vez (route group loading.tsx vale
// pra tudo dentro da pasta) — painel de marca é conteúdo estático real
// (idêntico ao AuthShell, não depende de nenhum fetch), só o card à direita
// vira skeleton. Silhueta genérica de propósito: diferenciar por rota
// (ex. lista de empresas em escolher-empresa) é polimento que essa fatia
// não precisa — o problema real era a tela branca sem marca nenhuma.
export default function CarregandoAuth() {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[42%] shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[#14181A] to-[#0F2620] px-10 py-10 text-sidebar-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-gradient-to-br from-[#D8583A] to-[#A87C1F] opacity-20 blur-3xl"
        />
        <span className="relative font-heading text-lg font-bold tracking-tight">Finanssi</span>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="font-heading text-lg font-bold tracking-tight text-foreground">Finanssi</span>
          </div>

          <Skeleton className="mb-1.5 h-8 w-40" />
          <Skeleton className="mb-8 h-4 w-56" />

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-full rounded-control" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-full rounded-control" />
            </div>
            <Skeleton className="h-9 w-full rounded-control" />
          </div>
        </div>
      </div>
    </div>
  );
}
