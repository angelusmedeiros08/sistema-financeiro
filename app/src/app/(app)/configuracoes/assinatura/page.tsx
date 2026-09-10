import { redirect } from "next/navigation";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarAssinaturaAsaas, buscarCobrancaAtualAsaas } from "@/lib/asaas/consulta";
import { ErroAsaas } from "@/lib/asaas/cliente-http";
import { assinarDuranteTrialAction } from "@/lib/pagamentos/autoatendimento-actions";
import { VALOR_PLANO_MENSAL, DESCRICAO_PLANO } from "@/lib/pagamentos/plano";
import { TituloPagina } from "@/components/layout/titulo-pagina";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BotaoCheckoutAssinatura } from "@/components/pagamentos/botao-checkout-assinatura";
import { formatarMoeda, formatarDataBrasil } from "@/lib/formatacao";
import { CancelarAssinaturaButton } from "./cancelar-assinatura-button";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";

export default async function PaginaAssinatura({
  searchParams,
}: {
  searchParams: Promise<{ retorno?: string }>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { retorno } = await searchParams;

  if (contexto.papel !== "admin") {
    return (
      <div className="flex flex-col gap-6">
        <TituloPagina>Assinatura</TituloPagina>
        <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Só o administrador da empresa pode ver e gerenciar a assinatura.
        </p>
      </div>
    );
  }

  let proximoVencimento: string | null = null;
  let linkUltimaFatura: string | null = null;
  let falhaAsaas = false;

  if (contexto.asaasSubscriptionId) {
    try {
      const [assinatura, cobranca] = await Promise.all([
        buscarAssinaturaAsaas(contexto.asaasSubscriptionId),
        buscarCobrancaAtualAsaas(contexto.asaasSubscriptionId),
      ]);
      proximoVencimento = assinatura.nextDueDate;
      linkUltimaFatura = cobranca?.invoiceUrl ?? null;
    } catch (erro) {
      if (!(erro instanceof ErroAsaas)) throw erro;
      falhaAsaas = true;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <TituloPagina>Assinatura</TituloPagina>

      {retorno === "confirmando" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm text-foreground">
          <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-primary" />
          <p>Estamos confirmando seu pagamento com o Asaas. Isso costuma levar só alguns instantes, atualize a página em instantes.</p>
        </div>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{DESCRICAO_PLANO}</p>
            <p className="text-2xl font-bold text-foreground">
              {formatarMoeda(VALOR_PLANO_MENSAL)} <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
          </div>
          <BadgeStatus status={contexto.statusAssinatura} />
        </div>

        {contexto.statusAssinatura === "cancelamento_agendado" && contexto.acessoAte && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#C98A1F]/30 bg-[#C98A1F]/8 p-3 text-sm dark:border-[#C98A1F]/25 dark:bg-[#C98A1F]/12">
            <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-[#96690F] dark:text-[#F0BB4E]" />
            <p className="text-foreground">
              Sua assinatura foi cancelada. O acesso continua normal até <strong>{formatarDataBrasil(contexto.acessoAte)}</strong>, depois
              disso o sistema fica bloqueado até você reativar.
            </p>
          </div>
        )}

        {contexto.statusAssinatura === "trial" && contexto.trialTerminaEm && (
          <p className="text-sm text-muted-foreground">Período de teste até {formatarDataBrasil(contexto.trialTerminaEm)}.</p>
        )}

        {proximoVencimento && contexto.statusAssinatura === "ativo" && (
          <p className="text-sm text-muted-foreground">Próximo vencimento: {formatarDataBrasil(proximoVencimento)}.</p>
        )}

        {falhaAsaas && (
          <p className="text-xs text-muted-foreground">
            Não foi possível consultar os detalhes de cobrança agora. As ações abaixo continuam disponíveis.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {linkUltimaFatura && (
            <Button asChild variant="outline">
              <a href={linkUltimaFatura} target="_blank" rel="noopener noreferrer">
                Ver última fatura
              </a>
            </Button>
          )}

          {contexto.statusAssinatura === "trial" && (
            <BotaoCheckoutAssinatura acao={assinarDuranteTrialAction} label="Assinar agora" labelPendente="Abrindo checkout..." />
          )}

          {contexto.statusAssinatura === "ativo" && <CancelarAssinaturaButton proximoVencimento={proximoVencimento} />}
        </div>
      </section>
    </div>
  );
}

function BadgeStatus({ status }: { status: string | null }) {
  if (status === "ativo") return <Badge variant="outline">Ativa</Badge>;
  if (status === "trial") return <Badge variant="secondary">Período de teste</Badge>;
  if (status === "cancelamento_agendado")
    return <Badge className="border-[#C98A1F]/30 bg-[#C98A1F]/12 text-[#96690F] dark:bg-[#C98A1F]/20 dark:text-[#F0BB4E]">Cancelamento agendado</Badge>;
  return <Badge variant="outline">{status ?? "—"}</Badge>;
}
