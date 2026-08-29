import { redirect } from "next/navigation";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { acessoLiberado } from "@/lib/pagamentos/plano";
import { createClient } from "@/utils/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BotaoVoltar } from "@/components/layout/botao-voltar";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) {
    redirect("/entrar");
  }

  // Gate de assinatura — achado CRÍTICO em auditoria de segurança
  // (29/08/2026): antes disso, nada verificava status_assinatura/trial em
  // nenhuma camada, então cobrança nunca tinha efeito real sobre o acesso.
  // Roda antes do redirect de papel abaixo — vale igual pra staff e
  // cliente_portal, é o mesmo serviço sendo pago pelo tenant.
  if (!acessoLiberado(contexto.statusAssinatura, contexto.trialTerminaEm)) {
    redirect("/assinatura-pendente");
  }

  // dupla proteção (UX — a garantia real é a RLS por papel): cliente_portal
  // não tem motivo pra ver a sidebar cheia de formulários que vão falhar.
  if (contexto.papel === "cliente_portal") {
    redirect("/portal");
  }

  const supabase = await createClient();
  const [{ data: alertas }, { data: usuario }] = await Promise.all([
    supabase
      .from("alertas_enviados")
      .select("id, tipo, enviado_em")
      .eq("tenant_id", contexto.tenantId)
      .eq("destinatario_id", contexto.user.id)
      .order("enviado_em", { ascending: false })
      .limit(5),
    supabase.from("usuarios").select("nome").eq("id", contexto.user.id).single(),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar emailUsuario={contexto.user.email ?? undefined} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          tenantNome={contexto.tenantNome}
          tenantId={contexto.tenantId}
          tenantsDisponiveis={contexto.tenantsDisponiveis}
          nome={usuario?.nome ?? contexto.user.email ?? ""}
          notificacoes={(alertas ?? []).map((a) => ({ id: a.id, tipo: a.tipo, enviadoEm: a.enviado_em }))}
        />
        <main className="flex-1 px-4 py-8 lg:px-8">
          {children}
          <BotaoVoltar />
        </main>
      </div>
    </div>
  );
}
