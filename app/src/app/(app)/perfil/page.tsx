import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { ROTULO_PAPEL } from "@/lib/tenant/rotulos";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { sair } from "@/app/(auth)/actions";
import { TituloPagina } from "@/components/layout/titulo-pagina";

export default async function PaginaPerfil() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, email")
    .eq("id", contexto.user.id)
    .single();

  const nome = usuario?.nome ?? contexto.user.email ?? "Usuário";
  const email = usuario?.email ?? contexto.user.email ?? "";
  const inicial = nome.charAt(0).toUpperCase();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <TituloPagina>Meu perfil</TituloPagina>

      <div className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-card">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
          {inicial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-foreground">{nome}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-card">
        <h2 className="font-heading text-sm font-bold text-foreground">Empresa e acesso</h2>

        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Empresa</span>
          <span className="font-medium text-foreground">{contexto.tenantNome}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Papel</span>
          <Badge variant="outline">{ROTULO_PAPEL[contexto.papel] ?? contexto.papel}</Badge>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-2xl bg-card p-5 shadow-card">
        <div>
          <h2 className="font-heading text-sm font-bold text-foreground">Tema</h2>
          <p className="text-xs text-muted-foreground">Claro ou escuro, aplicado só neste navegador.</p>
        </div>
        <ThemeToggle />
      </div>

      <form action={sair}>
        <Button variant="outline" type="submit" className="w-full gap-2">
          <SignOut size={16} />
          Sair da conta
        </Button>
      </form>
    </div>
  );
}
