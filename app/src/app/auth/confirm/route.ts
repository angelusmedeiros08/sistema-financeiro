import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Destino do redirectTo de qualquer fluxo de auth por e-mail (convite,
// confirmação de cadastro, recuperação de senha) — @supabase/ssr usa PKCE
// por padrão, então o link do e-mail sempre volta aqui com ?code=..., não
// com o token no fragmento da URL. Troca o code por uma sessão de verdade
// (cookie) antes de mandar o usuário pra onde ele precisa ir a seguir.
// Só aceita path relativo de dentro do próprio app — "next" vem de um
// parâmetro de URL de e-mail, então "@evil.com/x" ou "//evil.com" viram
// destino de redirect open-redirect se aceitos sem checagem (o host
// confiável apareceria primeiro na URL, favorecendo phishing).
function proximaRotaSegura(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/painel";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = proximaRotaSegura(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/entrar?erro=link_invalido`);
}
