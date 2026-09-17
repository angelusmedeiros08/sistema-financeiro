// Login/cadastro/etc. é sempre claro, de propósito (a página inteira roda
// dentro de .tema-claro-forcado, aplicado no layout do grupo (auth)) — por
// isso a logo aqui é sempre a variante clara, sem o par claro/escuro que o
// resto do app usa.
function Logo({ className }: { className?: string }) {
  return <img src="/logo/completo-claro.png" alt="Finanssi" className={className} />;
}

// Linha do login real da Conta Azul (login.contaazul.com): coluna única,
// sem card, campos direto sobre o fundo da página — só que aqui a logo
// vira o ponto focal (grande, centralizada), em vez de pequena e à
// esquerda como no original.
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
    <div className="flex min-h-screen items-center justify-center bg-[color-mix(in_oklch,var(--background),var(--primary)_7%)] px-6 py-12">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto h-24 w-auto sm:h-28" />

        <div className="mt-9 text-center">
          <h1 className="font-heading text-2xl font-semibold leading-tight tracking-tight text-foreground">{titulo}</h1>
          <p className="mt-2 text-base text-muted-foreground">{subtitulo}</p>
        </div>

        <div className="mt-9">{children}</div>
      </div>
    </div>
  );
}
