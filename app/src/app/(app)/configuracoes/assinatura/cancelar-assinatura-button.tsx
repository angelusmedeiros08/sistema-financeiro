"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelarAssinaturaAction } from "@/lib/pagamentos/autoatendimento-actions";
import { formatarDataBrasil } from "@/lib/formatacao";

// Confirmação via window.confirm nativo — mesmo padrão já usado pra ação
// destrutiva simples no resto do sistema (ver cancelar-convite-button.tsx),
// em vez de introduzir um componente de dialog novo só pra isto.
export function CancelarAssinaturaButton({ proximoVencimento }: { proximoVencimento: string | null }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  function acionar() {
    const dataCorte = proximoVencimento ? formatarDataBrasil(proximoVencimento) : "o fim do período atual";
    const confirmado = confirm(
      `Cancelar sua assinatura do Finanssi? Você continua com acesso normal até ${dataCorte} — depois disso o sistema fica bloqueado até reativar. Seus dados nunca são apagados.`,
    );
    if (!confirmado) return;

    iniciar(async () => {
      const resultado = await cancelarAssinaturaAction();
      if ("erro" in resultado) {
        toast.error(resultado.erro);
        return;
      }
      toast.success(`Assinatura cancelada. Acesso liberado até ${formatarDataBrasil(resultado.acessoAte)}.`);
      router.refresh();
    });
  }

  return (
    <Button variant="outline" className="text-destructive hover:text-destructive" disabled={pendente} onClick={acionar}>
      {pendente ? "Cancelando..." : "Cancelar assinatura"}
    </Button>
  );
}
