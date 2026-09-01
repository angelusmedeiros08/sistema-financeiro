"use client";

import { useEffect, useState } from "react";

// Só propaga `true` depois de `delayMs` de `pending` contínuo — evita que
// uma troca de filtro rápida demais (ex. Supabase respondendo em <100ms)
// pisque um estado "atualizando" que ninguém chega a perceber direito.
// Assim que `pending` vira `false`, o retorno acompanha na hora, sem atraso
// (reset ajustado durante o render, não no efeito, pra zerar sem esperar
// o próximo ciclo — só o `true` atrasado passa pelo timeout no efeito).
export function useDelayedPending(pending: boolean, delayMs = 250): boolean {
  const [atrasado, setAtrasado] = useState(false);
  const [pendingAnterior, setPendingAnterior] = useState(pending);

  if (pending !== pendingAnterior) {
    setPendingAnterior(pending);
    if (!pending) setAtrasado(false);
  }

  useEffect(() => {
    if (!pending) return;
    const temporizador = setTimeout(() => setAtrasado(true), delayMs);
    return () => clearTimeout(temporizador);
  }, [pending, delayMs]);

  return atrasado;
}
