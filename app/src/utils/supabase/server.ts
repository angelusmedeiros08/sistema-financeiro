import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

// Cliente para usar em Server Components, Server Actions e Route Handlers.
// Nunca usa a service_role key aqui — sempre a anon key, com RLS ativa,
// autenticado via cookie de sessão do usuário.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // set() chamado de um Server Component sem middleware rodando
            // depois — ignorável se houver middleware de refresh de sessão.
          }
        },
      },
    },
  );
}
