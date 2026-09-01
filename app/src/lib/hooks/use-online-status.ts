"use client";

import { useSyncExternalStore } from "react";

function inscrever(retorno: () => void) {
  window.addEventListener("online", retorno);
  window.addEventListener("offline", retorno);
  return () => {
    window.removeEventListener("online", retorno);
    window.removeEventListener("offline", retorno);
  };
}

function lerEstadoCliente() {
  return navigator.onLine;
}

// Servidor não tem `navigator` — assume online, corrige assim que o
// cliente hidrata e lê o valor real. `useSyncExternalStore` é o jeito
// correto de assinar uma API do navegador desse tipo (evita tanto
// mismatch de hidratação quanto o padrão "setState dentro de efeito" que
// useState+useEffect exigiria aqui).
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(inscrever, lerEstadoCliente, () => true);
}
