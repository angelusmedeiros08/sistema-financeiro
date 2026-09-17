import { CarrosselAuth } from "./carrossel-auth";

function Logo({ className }: { className?: string }) {
  return (
    <>
      <img src="/logo/completo-claro.png" alt="Finanssi" className={`${className} dark:hidden`} />
      <img src="/logo/completo-escuro.png" alt="Finanssi" className={`hidden ${className} dark:block`} />
    </>
  );
}

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
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="hidden flex-col items-center justify-center gap-14 border-r border-border bg-[color-mix(in_oklch,var(--background),var(--primary)_9%)] px-12 py-16 lg:flex">
        <Logo className="h-12 w-auto" />
        <CarrosselAuth />
      </div>

      <div className="flex items-center justify-center bg-card px-6 py-10 lg:px-16">
        <div className="w-full max-w-sm">
          <Logo className="h-14 w-auto lg:hidden" />

          <span className="mt-9 block h-1 w-10 rounded-full bg-primary lg:mt-0" />

          <h1 className="mt-5 font-heading text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground">{titulo}</h1>
          <p className="mt-2 text-base text-muted-foreground">{subtitulo}</p>

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
