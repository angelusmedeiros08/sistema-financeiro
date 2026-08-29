"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

// Volta um passo no histórico real do navegador — mesmo mecanismo do botão
// Voltar nativo, não uma rota-pai fixa por tela (ver spec, Seção 1: cobre
// rota nova automaticamente, sem precisar mapear a hierarquia de cada uma
// das ~40 rotas do app).
//
// Botão pequeno, dentro do módulo (não na Topbar, não uma barra fixa — ver
// Seção 8 da spec: 3ª revisão pedida ao vivo pelo usuário, as duas
// primeiras tentativas — ícone na Topbar, depois barra fixa embaixo —
// foram rejeitadas). Renderiza como PRIMEIRO filho de `<main>` em
// (app)/layout.tsx, antes de `{children}` — rola junto com a página
// (nunca fixed/sticky), sem container de largura própria (a página que já
// centraliza seu próprio conteúdo com o max-w que escolher).
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
  // volta rápida sem reabrir a sidebar.
  const segmentos = pathname.split("/").filter(Boolean);
  if (segmentos.length <= 1) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={!temHistorico}
      onClick={() => router.back()}
      className="mb-4 gap-1.5"
    >
      <ArrowLeft size={15} weight="bold" />
      Voltar
    </Button>
  );
}
