import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";

// Destino do callback do Checkout Asaas — nunca é tratado como prova de
// pagamento (qualquer um pode visitar essa URL manualmente, com ou sem ter
// pago de verdade). Não provisiona nada, não cria sessão, não mostra dado
// de tenant algum. O único gatilho real de acesso é o webhook
// (api/webhooks/asaas/route.ts), validado server-to-server — ver spec
// 2026-08-23-checkout-assinatura-provisionamento-design.md, "Segurança do
// retorno do checkout".
export default async function PaginaRetornoAssinatura({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const cancelado = status === "cancelado";

  return (
    <AuthShell
      titulo={cancelado ? "Pagamento não concluído" : "Recebemos seu pagamento"}
      subtitulo={cancelado ? "Nenhuma cobrança foi feita." : "Só mais um passo."}
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        {cancelado ? (
          <p>Você saiu do checkout antes de concluir — nenhuma cobrança foi feita. Pode tentar de novo quando quiser.</p>
        ) : (
          <p>
            Estamos confirmando o pagamento com o Asaas — isso costuma levar só alguns instantes. Assim que confirmar,
            enviamos um e-mail pra você definir sua senha e começar a usar o Finanssi.
          </p>
        )}

        <Button asChild variant={cancelado ? "default" : "ghost"} className="w-full">
          <Link href={cancelado ? "/assinar" : "/entrar"}>{cancelado ? "Tentar de novo" : "Já tenho conta"}</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
