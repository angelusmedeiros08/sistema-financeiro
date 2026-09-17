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
    <div className="flex min-h-screen items-center justify-center bg-[color-mix(in_oklch,var(--background),var(--primary)_7%)] px-6 py-10">
      <div className="w-full max-w-sm">
        <img src="/logo/completo-claro.png" alt="Finanssi" className="h-16 w-auto dark:hidden" />
        <img src="/logo/completo-escuro.png" alt="Finanssi" className="hidden h-16 w-auto dark:block" />

        <h1 className="mt-10 font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground">{titulo}</h1>
        <p className="mt-2 text-base text-muted-foreground">{subtitulo}</p>

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
