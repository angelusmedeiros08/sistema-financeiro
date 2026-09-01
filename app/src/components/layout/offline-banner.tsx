"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { WifiSlash } from "@phosphor-icons/react";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

// Persistente (nunca some sozinho, diferente de um toast) enquanto offline
// — erro de conexão precisa continuar visível até a pessoa perceber e
// resolver, não sumir depois de alguns segundos. Ao reconectar, um toast
// avisa uma vez só (guardado em ref pra não disparar de novo em cada
// re-render, só na transição real de offline→online).
export function OfflineBanner() {
  const online = useOnlineStatus();
  const estavaOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      estavaOffline.current = true;
      return;
    }
    if (estavaOffline.current) {
      estavaOffline.current = false;
      toast.success("Conexão restabelecida.");
    }
  }, [online]);

  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-xs font-semibold text-white">
      <WifiSlash size={15} weight="bold" className="shrink-0" />
      Sem conexão com a internet. Algumas ações podem falhar até a conexão voltar.
    </div>
  );
}
