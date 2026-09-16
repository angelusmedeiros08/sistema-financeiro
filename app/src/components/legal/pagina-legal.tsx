import Link from "next/link";

export function PaginaLegal({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Link href="/" className="font-heading text-lg font-bold tracking-tight text-foreground">
          Finanssi
        </Link>

        <div className="rounded-2xl bg-card shadow-card p-6 sm:p-8">
          <h1 className="mb-6 font-heading text-2xl font-bold tracking-tight text-foreground">{titulo}</h1>
          <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function SecaoLegal({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-heading text-base font-bold tracking-tight text-foreground">{titulo}</h2>
      <div className="flex flex-col gap-2 text-muted-foreground">{children}</div>
    </section>
  );
}
