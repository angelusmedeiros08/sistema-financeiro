import { redirect } from "next/navigation";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) {
    redirect("/entrar");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar tenantNome={contexto.tenantNome} email={contexto.user.email ?? ""} />
        <main className="flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
