import { Skeleton } from "@/components/ui/skeleton";

// Cobre as 9 rotas de autenticação de uma vez (route group loading.tsx vale
// pra tudo dentro da pasta) — mesma casca do AuthShell real (logo grande
// centralizada, fundo levemente laranja), só os campos viram skeleton.
// Precisa ficar em sincronia manual com auth-shell.tsx sempre que ele mudar
// de layout — encontrado como bug real: essa tela tinha ficado com o
// design antigo (painel escuro com gradiente, só o nome em texto) depois
// que o AuthShell foi todo refeito, e aparecia como um flash visual feio
// logo após cadastro/login.
export default function CarregandoAuth() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color-mix(in_oklch,var(--background),var(--primary)_7%)] px-6 py-12">
      <div className="w-full max-w-sm">
        <img src="/logo/completo-claro.png" alt="Finanssi" className="mx-auto h-24 w-auto dark:hidden sm:h-28" />
        <img src="/logo/completo-escuro.png" alt="Finanssi" className="mx-auto hidden h-24 w-auto dark:block sm:h-28" />

        <div className="mt-9 flex flex-col items-center gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>

        <div className="mt-9 space-y-6">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-10 w-full rounded-control" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-10 w-full rounded-control" />
          </div>
          <Skeleton className="h-10 w-full rounded-control" />
        </div>
      </div>
    </div>
  );
}
