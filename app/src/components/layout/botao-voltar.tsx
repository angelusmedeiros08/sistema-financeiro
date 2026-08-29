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
// Barra fixa na parte de baixo da viewport (não um ícone na Topbar, ver
// Seção 5 da spec — revisão pedida ao vivo pelo usuário: "embaixo, com o
// nome Voltar, não uma seta sozinha"), renderizada como o ÚLTIMO filho de
// `<main>` em (app)/layout.tsx — de propósito, não na Topbar. Um espaçador
// normal (sem position:fixed) do tamanho exato da barra nasce junto, então
// o fim do conteúdo de qualquer página nunca fica escondido atrás da barra
// fixa, sem precisar coordenar um `padding-bottom` fixo no layout do lado
// do servidor (que não sabe se esta página vai mostrar a barra ou não).
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
    <>
      {/* Espaçador — mesma altura da barra fixa abaixo (h-20 = 64px de
          barra + o padding vertical), garante que o último elemento real
          da página nunca fique tapado. */}
      <div className="h-20 shrink-0" aria-hidden />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card pb-[max(env(safe-area-inset-bottom),0px)] lg:left-[60px]">
        <div className="mx-auto flex max-w-4xl items-center px-4 py-3 lg:px-8">
          <Button
            variant="outline"
            size="lg"
            disabled={!temHistorico}
            onClick={() => router.back()}
            className="w-full gap-2 lg:w-auto"
          >
            <ArrowLeft size={18} weight="bold" />
            Voltar
          </Button>
        </div>
      </div>
    </>
  );
}
