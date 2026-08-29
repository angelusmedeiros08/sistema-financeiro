import { redirect } from "next/navigation";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { acessoLiberado } from "@/lib/pagamentos/plano";
import { sair } from "@/app/(auth)/actions";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";

const TITULO_POR_STATUS: Record<string, string> = {
  trial: "Seu período de teste acabou",
  inadimplente: "Pagamento pendente",
  cancelado: "Assinatura cancelada",
};

const MENSAGEM_POR_STATUS: Record<string, string> = {
  trial: "O período de teste gratuito da sua empresa chegou ao fim. Assine pra continuar usando o Finanssi — seus dados continuam guardados, nada foi apagado.",
  inadimplente: "Não conseguimos confirmar o pagamento mais recente da sua assinatura. Regularize pra recuperar o acesso — seus dados continuam guardados, nada foi apagado.",
  cancelado: "A assinatura da sua empresa foi cancelada. Reative pra voltar a acessar o sistema — seus dados continuam guardados, nada foi apagado.",
};

// Único ponto de saída de quem cai aqui redirecionado pelo gate de
// assinatura ((app)/layout.tsx e (portal)/layout.tsx) — achado CRÍTICO em
// auditoria de segurança (29/08/2026): antes disso, nada bloqueava acesso
// de um tenant com trial vencido ou assinatura cancelada/inadimplente.
// Sem self-service de reativação ainda (não existe portal de cobrança do
// Asaas integrado) — o caminho é contato direto até isso existir.
export default async function PaginaAssinaturaPendente() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  // Se o acesso já está liberado (ex.: pagamento acabou de confirmar e o
  // usuário voltou pra essa aba antiga), manda de volta em vez de prender
  // numa tela que não se aplica mais.
  if (acessoLiberado(contexto.statusAssinatura, contexto.trialTerminaEm)) {
    redirect(contexto.papel === "cliente_portal" ? "/portal" : "/painel");
  }

  const status = contexto.statusAssinatura ?? "cancelado";
  const emailContato = process.env.BREVO_SENDER_EMAIL;

  return (
    <AuthShell titulo={TITULO_POR_STATUS[status] ?? TITULO_POR_STATUS.cancelado} subtitulo={contexto.tenantNome}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{MENSAGEM_POR_STATUS[status] ?? MENSAGEM_POR_STATUS.cancelado}</p>

        {emailContato ? (
          <Button asChild className="w-full">
            <a href={`mailto:${emailContato}?subject=${encodeURIComponent(`Regularizar assinatura — ${contexto.tenantNome}`)}`}>
              Falar com o suporte
            </a>
          </Button>
        ) : (
          <p className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Entre em contato com quem administra sua conta pra regularizar o pagamento.
          </p>
        )}

        <form action={sair}>
          <Button type="submit" variant="ghost" className="w-full">
            Sair
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
