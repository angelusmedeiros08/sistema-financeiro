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
    <div className="flex min-h-screen items-center justify-center bg-[color-mix(in_oklch,var(--background),var(--primary)_7%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img src="/logo/completo-claro.png" alt="Finanssi" className="h-24 w-auto dark:hidden" />
          <img src="/logo/completo-escuro.png" alt="Finanssi" className="hidden h-24 w-auto dark:block" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-[0_20px_50px_-28px_rgba(26,29,31,0.35)]">
          <h1 className="mb-1.5 text-center font-heading text-2xl font-bold tracking-tight text-foreground">{titulo}</h1>
          <p className="mb-8 text-center text-sm text-muted-foreground">{subtitulo}</p>

          {children}
        </div>
      </div>
    </div>
  );
}
