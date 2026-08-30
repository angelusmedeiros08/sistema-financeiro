import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // secure explícito — mesmo motivo de utils/supabase/server.ts.
    { cookieOptions: { secure: process.env.NODE_ENV === "production" } },
  );
}
