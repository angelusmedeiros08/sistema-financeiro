import { cn } from "@/lib/utils";

// Ponto de entrada visual na topbar (achado em pedido do usuário, 03/09/2026:
// "pensando nos módulos que ainda vamos fazer" — cobrança/plano é um desses
// blocos, hoje sem nenhum indício na UI além da tela de bloqueio quando o
// acesso já caiu). Só aparece durante o trial — depois de "ativo" o selo
// deixa de ter função (ninguém precisa de lembrete permanente que já paga),
// mesmo padrão da maioria dos SaaS. Estados "inadimplente"/"cancelado"
// nunca chegam aqui: (app)/layout.tsx já redireciona pra /assinatura-pendente
// antes da Topbar renderizar.
function diasRestantes(trialTerminaEm: string | null): number | null {
  if (!trialTerminaEm) return null;
  const ms = new Date(trialTerminaEm).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function StatusPlano({
  statusAssinatura,
  trialTerminaEm,
}: {
  statusAssinatura: "trial" | "ativo" | "inadimplente" | "cancelado" | null;
  trialTerminaEm: string | null;
}) {
  if (statusAssinatura !== "trial") return null;
  const dias = diasRestantes(trialTerminaEm);
  if (dias === null) return null;

  const perto = dias <= 2;

  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium lg:flex",
        perto ? "border-destructive/30 text-destructive" : "border-border text-muted-foreground",
      )}
      title={`Período de teste — ${dias === 1 ? "1 dia restante" : `${dias} dias restantes`}`}
    >
      Trial · {dias}d
    </span>
  );
}
