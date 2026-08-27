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
      <div className="relative hidden w-[42%] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#14181A] to-[#0F2620] px-10 py-10 text-sidebar-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-gradient-to-br from-[#D8583A] to-[#A87C1F] opacity-20 blur-3xl"
        />
        <span className="font-heading text-lg font-bold tracking-tight">Finanssi</span>

        <p className="relative max-w-sm font-heading text-2xl font-bold leading-snug tracking-tight text-white">
          Cada lançamento gera partidas dobradas corretas, automaticamente.
        </p>

        <p className="relative text-sm text-white/50">
          Finanssi · núcleo financeiro multi-tenant, construído sobre um livro-razão de verdade.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="font-heading text-lg font-bold tracking-tight text-foreground">Finanssi</span>
          </div>

          <h1 className="mb-1.5 font-heading text-2xl font-bold tracking-tight text-foreground">{titulo}</h1>
          <p className="mb-8 text-sm text-muted-foreground">{subtitulo}</p>

          {children}
        </div>
      </div>
    </div>
  );
}
