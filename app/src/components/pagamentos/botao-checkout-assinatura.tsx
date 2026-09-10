"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Compartilhado entre "Reativar assinatura" (/assinatura-pendente) e
// "Assinar agora" (/configuracoes/assinatura, durante o trial) — as duas
// chamam uma action sem argumento que redireciona pro Checkout do Asaas no
// sucesso (redirect() nunca resolve a Promise normalmente) e só retorna
// algo quando falha antes de conseguir redirecionar.
export function BotaoCheckoutAssinatura({
  acao,
  label,
  labelPendente,
}: {
  acao: () => Promise<{ erro: string } | void>;
  label: string;
  labelPendente: string;
}) {
  const [pendente, iniciar] = useTransition();

  return (
    <Button
      className="w-full"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const resultado = await acao();
          if (resultado && "erro" in resultado) toast.error(resultado.erro);
        })
      }
    >
      {pendente ? labelPendente : label}
    </Button>
  );
}
