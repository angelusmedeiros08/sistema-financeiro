import { redirect } from "next/navigation";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) {
    redirect("/entrar");
  }

  // dupla proteção (UX — a garantia real é a RLS por papel): cliente_portal
  // não tem motivo pra ver a sidebar cheia de formulários que vão falhar.
  if (contexto.papel === "cliente_portal") {
    redirect("/portal");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar emailUsuario={contexto.user.email ?? undefined} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar tenantNome={contexto.tenantNome} email={contexto.user.email ?? ""} />
        <main className="flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
