"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { assinarDuranteTrialAction } from "@/lib/pagamentos/autoatendimento-actions";
import type { StatusAssinatura } from "@/lib/pagamentos/plano";
import { formatarDataBrasil } from "@/lib/formatacao";

// Ponto de entrada visual na topbar (achado em pedido do usuário, 03/09/2026:
// "pensando nos módulos que ainda vamos fazer" — cobrança/plano é um desses
// blocos, hoje sem nenhum indício na UI além da tela de bloqueio quando o
// acesso já caiu). Estados "inadimplente"/"cancelado" nunca chegam aqui:
// (app)/layout.tsx já redireciona pra /assinatura-pendente antes da Topbar
// renderizar.
function diasRestantes(dataIso: string | null): number | null {
  if (!dataIso) return null;
  const ms = new Date(dataIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function StatusPlano({
  statusAssinatura,
  trialTerminaEm,
  acessoAte,
}: {
  statusAssinatura: StatusAssinatura | null;
  trialTerminaEm: string | null;
  acessoAte: string | null;
}) {
  const [pendente, iniciar] = useTransition();

  // Autoatendimento de assinatura (09/09/2026): durante o trial, o selo era
  // só um texto informativo — agora é o próprio "Assinar agora", pra não
  // esperar o trial acabar pra descobrir que dava pra assinar antes.
  // Componente cliente (em vez de <form action={...}>) porque a action
  // pode devolver { erro } — precisa de onde mostrar isso, não só redirect.
  if (statusAssinatura === "trial") {
    const dias = diasRestantes(trialTerminaEm);
    if (dias === null) return null;
    const perto = dias <= 2;

    return (
      <button
        type="button"
        disabled={pendente}
        title="Assinar agora e não esperar o trial acabar"
        onClick={() =>
          iniciar(async () => {
            const resultado = await assinarDuranteTrialAction();
            if (resultado && "erro" in resultado) toast.error(resultado.erro);
          })
        }
        className={cn(
          "hidden items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors lg:flex",
          perto
            ? "border-destructive/30 text-destructive hover:bg-destructive/10"
            : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
        )}
      >
        {pendente ? "Abrindo checkout..." : `Assinar agora · ${dias}d`}
      </button>
    );
  }

  // Cancelamento voluntário ainda dentro da carência — mantém o acesso
  // visível na topbar pra ninguém ser pego de surpresa quando o prazo virar
  // bloqueio de verdade (mesmo raciocínio do trial acima).
  if (statusAssinatura === "cancelamento_agendado" && acessoAte) {
    return (
      <Link
        href="/configuracoes/assinatura"
        title="Assinatura cancelada. Clique pra ver os detalhes ou reativar."
        className="hidden items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary lg:flex"
      >
        Acesso até {formatarDataBrasil(acessoAte)}
      </Link>
    );
  }

  return null;
}
