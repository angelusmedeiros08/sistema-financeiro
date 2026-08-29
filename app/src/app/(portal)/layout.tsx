import { redirect } from "next/navigation";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { acessoLiberado } from "@/lib/pagamentos/plano";
import { PortalTopbar } from "@/components/layout/portal-topbar";

export default async function LayoutPortal({ children }: { children: React.ReactNode }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  // Mesmo gate de assinatura de (app)/layout.tsx — o cliente do portal
  // perde acesso junto quando o tenant (o escritório que paga a
  // assinatura) fica inadimplente/cancelado, é o mesmo serviço.
  if (!acessoLiberado(contexto.statusAssinatura, contexto.trialTerminaEm)) {
    redirect("/assinatura-pendente");
  }

  // dupla proteção (UX, não segurança de verdade — RLS já impede escrita
  // de qualquer papel que não seja um dos 4 internos, mesmo que alguém
  // chegue direto numa rota do app principal digitando a URL): um papel
  // interno não tem motivo pra ver o shell simplificado do portal.
  if (contexto.papel !== "cliente_portal") {
    redirect("/painel");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PortalTopbar tenantNome={contexto.tenantNome} email={contexto.user.email ?? ""} />
      <main className="flex-1 px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}
