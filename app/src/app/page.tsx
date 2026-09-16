import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PaginaLanding } from "@/components/landing/pagina-landing";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/painel");

  return <PaginaLanding />;
}
