import { redirect } from "next/navigation";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { acessoLiberado } from "@/lib/pagamentos/plano";
import { buscarCobrancaAtualAsaas } from "@/lib/asaas/consulta";
import { ErroAsaas } from "@/lib/asaas/cliente-http";
import { sair } from "@/app/(auth)/actions";
import { reativarAssinaturaAction } from "@/lib/pagamentos/autoatendimento-actions";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { BotaoCheckoutAssinatura } from "@/components/pagamentos/botao-checkout-assinatura";

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
//
// Autoatendimento de assinatura (09/09/2026): "inadimplente" e "cancelado"
// ganharam ação de verdade aqui (pagar a fatura pendente / reativar), em
// vez de só um mailto pro suporte — o mailto continua como contato
// secundário, nunca substituído.
export default async function PaginaAssinaturaPendente({
  searchParams,
}: {
  searchParams: Promise<{ retorno?: string }>;
}) {
  const contexto = await obterUsuarioETenantAtual(true);
  if ("erro" in contexto) redirect("/entrar");

  // Se o acesso já está liberado (ex.: pagamento acabou de confirmar e o
  // usuário voltou pra essa aba antiga), manda de volta em vez de prender
  // numa tela que não se aplica mais.
  if (acessoLiberado(contexto.statusAssinatura, contexto.trialTerminaEm, contexto.acessoAte)) {
    redirect(contexto.papel === "cliente_portal" ? "/portal" : "/painel");
  }

  const { retorno } = await searchParams;
  const status = contexto.statusAssinatura ?? "cancelado";
  const emailContato = process.env.BREVO_SENDER_EMAIL;
  const ehAdmin = contexto.papel === "admin";

  // "trial" chegando aqui é o trial vencido — a assinatura no Asaas já
  // existe desde o cadastro (criada junto do checkout, cobra no próprio
  // vencimento do trial), só ainda não foi confirmada. Mesmo caminho de
  // "inadimplente": busca a cobrança já existente, nunca gera um checkout
  // novo (isso duplicaria a assinatura — reativarAssinaturaAction é só pra
  // "cancelado", onde a assinatura antiga já está morta de verdade).
  let linkFaturaPendente: string | null = null;
  if ((status === "inadimplente" || status === "trial") && ehAdmin && contexto.asaasSubscriptionId) {
    try {
      const cobranca = await buscarCobrancaAtualAsaas(contexto.asaasSubscriptionId);
      linkFaturaPendente = cobranca?.invoiceUrl ?? null;
    } catch (erro) {
      if (!(erro instanceof ErroAsaas)) throw erro;
      // Sem link, cai no fallback de contato abaixo — nunca trava a tela.
    }
  }

  return (
    <AuthShell titulo={TITULO_POR_STATUS[status] ?? TITULO_POR_STATUS.cancelado} subtitulo={contexto.tenantNome}>
      <div className="space-y-4">
        {retorno === "confirmando" && (
          <div className="flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm text-foreground">
            <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-primary" />
            <p>Estamos confirmando seu pagamento com o Asaas — isso costuma levar só alguns instantes. Atualize a página em instantes.</p>
          </div>
        )}

        <p className="text-sm text-muted-foreground">{MENSAGEM_POR_STATUS[status] ?? MENSAGEM_POR_STATUS.cancelado}</p>

        {ehAdmin && (status === "inadimplente" || status === "trial") && linkFaturaPendente && (
          <Button asChild className="w-full">
            <a href={linkFaturaPendente} target="_blank" rel="noopener noreferrer">
              Pagar agora
            </a>
          </Button>
        )}

        {ehAdmin && status === "cancelado" && (
          <BotaoCheckoutAssinatura acao={reativarAssinaturaAction} label="Reativar assinatura" labelPendente="Abrindo checkout..." />
        )}

        {!ehAdmin && (
          <p className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Peça pra quem administra sua empresa no Finanssi regularizar o pagamento — só o administrador pode fazer isso.
          </p>
        )}

        {emailContato && (
          <Button asChild variant={ehAdmin ? "ghost" : "default"} className="w-full">
            <a href={`mailto:${emailContato}?subject=${encodeURIComponent(`Regularizar assinatura — ${contexto.tenantNome}`)}`}>
              Falar com o suporte
            </a>
          </Button>
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
