import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { caminhoInternoSeguro } from "@/lib/caminho-seguro";

// Destino do redirectTo de qualquer fluxo de auth por e-mail (convite,
// confirmação de cadastro, recuperação de senha) — @supabase/ssr usa PKCE
// por padrão, então o link do e-mail sempre volta aqui com ?code=..., não
// com o token no fragmento da URL. Troca o code por uma sessão de verdade
// (cookie) antes de mandar o usuário pra onde ele precisa ir a seguir.
function proximaRotaSegura(next: string | null): string {
  return caminhoInternoSeguro(next) ?? "/painel";
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
