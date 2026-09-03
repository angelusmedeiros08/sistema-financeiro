"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Broadcast, Spinner } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { caminhoElegivel, rotaAtualParaApresentar } from "@/lib/apresentacao/catalogo";
import { montarUrlSlide } from "@/lib/apresentacao/sessao";
import { criarApresentacaoAvulsa } from "@/app/(app)/apresentacoes/actions";

// Ícone de transmitir do Topbar — só aparece nas telas elegíveis do
// catálogo (Painel, Indicadores, Relatórios). Um clique já entra
// apresentando a tela atual, sem passar pelo fluxo de montar um roteiro
// (que continua existindo em /apresentacoes, pra quem quer um roteiro de
// verdade com várias telas). Componente próprio (não o Topbar inteiro)
// porque só ele precisa saber a rota atual — Topbar continua Server
// Component.
export function IconeTransmitir() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  if (!caminhoElegivel(pathname)) return null;

  async function apresentar() {
    const rota = rotaAtualParaApresentar(pathname, searchParams);
    if (!rota) return;

    setCarregando(true);
    const resultado = await criarApresentacaoAvulsa(rota);
    setCarregando(false);

    if ("erro" in resultado) {
      toast.error(resultado.erro);
      return;
    }
    router.push(montarUrlSlide(rota, { apresentacaoId: resultado.id, indice: 0, modo: "apresentador" }));
  }

  return (
    <Button variant="ghost" size="icon" disabled={carregando} onClick={apresentar} aria-label="Apresentar esta tela" title="Apresentar esta tela">
      {carregando ? (
        <Spinner size={19} weight="bold" className="animate-spin" />
      ) : (
        <Broadcast size={19} weight="bold" />
      )}
    </Button>
  );
}
