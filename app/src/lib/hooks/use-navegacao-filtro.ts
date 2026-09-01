"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDelayedPending } from "./use-delayed-pending";

// Centraliza o padrão repetido nos 3 controles de filtro de Relatórios
// (controles.tsx, dre-controles.tsx, dfc-controles.tsx): monta a query
// string preservando os outros parâmetros e navega. A diferença que
// resolve o "recarrega a tela inteira ao trocar filtro": o `router.push`
// roda dentro de `startTransition`, então o React mantém o conteúdo atual
// visível até a nova versão da página estar pronta, em vez de reativar o
// `loading.tsx` da rota. `pendente` já vem atrasado (~250ms) — só liga pra
// trocas que demorarem de verdade, não pisca em toda troca instantânea.
export function useNavegacaoFiltro() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [emTransicao, iniciarTransicao] = useTransition();
  const pendente = useDelayedPending(emTransicao);

  function navegarCom(entradas: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [chave, valor] of Object.entries(entradas)) params.set(chave, valor);
    const destino = `${pathname}?${params.toString()}`;
    iniciarTransicao(() => {
      router.push(destino);
    });
  }

  return { navegarCom, pendente };
}
