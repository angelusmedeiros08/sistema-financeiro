"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

// Volta um passo no histórico real do navegador — mesmo mecanismo do botão
// Voltar nativo, não uma rota-pai fixa por tela (ver spec, Seção 1: cobre
// rota nova automaticamente, sem precisar mapear a hierarquia de cada uma
// das ~40 rotas do app).
export function BotaoVoltar() {
  const router = useRouter();
  const pathname = usePathname();

  // Nasce desabilitado (servidor não sabe o histórico do navegador) — só
  // habilita depois de montar no cliente, evita mismatch de hidratação.
  // window.history.length > 1 não é um sinal perfeito (conta qualquer
  // entrada da aba, não só as do app), mas é o mesmo usado por apps de
  // produção pra essa decisão, e o pior caso já é o de um botão Voltar de
  // navegador comum.
  const [temHistorico, setTemHistorico] = useState(false);

  useEffect(() => {
    setTemHistorico(window.history.length > 1);
  }, []);

  // Só aparece em sub-página — uma rota de 1 segmento (/painel, /despesas,
  // /vendas...) é exatamente o que a sidebar já lista como destino direto;
  // "voltar" ali não faz sentido, é o próprio nível principal. 2+ segmentos
  // (/despesas/[id], /relatorios/dre, /configuracoes/categorias...) é
  // sempre um drill-down de alguma seção — aí sim faz sentido oferecer
  // volta rápida sem reabrir a sidebar (achado ao vivo: mostrar sempre,
  // inclusive no Painel, confundia mais do que ajudava).
  const segmentos = pathname.split("/").filter(Boolean);
  if (segmentos.length <= 1) return null;

  return (
    <Button variant="ghost" size="icon" disabled={!temHistorico} onClick={() => router.back()} aria-label="Voltar">
      <ArrowLeft size={20} />
    </Button>
  );
}
