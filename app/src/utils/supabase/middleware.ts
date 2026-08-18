import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Renova o token de sessão a cada requisição e mantém os cookies em dia.
// Sem isso, sessão expira de forma inconsistente entre client/server components.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: não remover — getUser() valida o token contra o servidor
  // Supabase (não confia só no que está no cookie). getSession() sozinho
  // não é suficiente para decidir autorização em middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /auth/* (confirmação de cadastro, e futuro reset de senha), /convite/
  // aceitar (a pessoa ainda não tem sessão até clicar "Aceitar" — ver
  // aceitarConvite() em (auth)/actions.ts) e /api/cron/* (autenticado por
  // segredo compartilhado, não sessão) são acessados por quem ainda não
  // tem sessão — sem essas entradas o gate abaixo intercepta a requisição
  // antes do route handler rodar.
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/entrar") ||
    request.nextUrl.pathname.startsWith("/cadastro") ||
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/convite/aceitar");
  const isPublicRoute =
    isAuthRoute ||
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/api/cron");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
