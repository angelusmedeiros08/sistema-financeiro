export function AuthShell({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[42%] shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[#14181A] to-[#0F2620] px-10 py-10 text-sidebar-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-gradient-to-br from-[#D8583A] to-[#A87C1F] opacity-20 blur-3xl"
        />
        <img src="/logo/completo-escuro.png" alt="Finanssi" className="relative w-64" />
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <img src="/logo/completo-claro.png" alt="Finanssi" className="w-48 dark:hidden" />
            <img src="/logo/completo-escuro.png" alt="Finanssi" className="hidden w-48 dark:block" />
          </div>

          <h1 className="mb-1.5 font-heading text-2xl font-bold tracking-tight text-foreground">{titulo}</h1>
          <p className="mb-8 text-sm text-muted-foreground">{subtitulo}</p>

          {children}
        </div>
      </div>
    </div>
  );
}
