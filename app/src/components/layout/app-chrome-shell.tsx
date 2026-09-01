"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PARAM_APRESENTACAO } from "@/lib/apresentacao/sessao";
import { caminhoElegivel } from "@/lib/apresentacao/catalogo";
import { ApresentacaoShell } from "@/components/apresentacao/apresentacao-shell";
import { BotaoVoltar } from "@/components/layout/botao-voltar";
import { OfflineBanner } from "@/components/layout/offline-banner";

// (app)/layout.tsx é um Server Component e não recebe searchParams (só
// Page.tsx recebe — layouts não re-renderizam na troca de query, ficariam
// com valor obsoleto). A única forma sancionada de reagir a searchParams num
// layout é um Client Component com useSearchParams(), dentro de Suspense —
// por isso essa decisão (Sidebar/Topbar normais vs. ApresentacaoShell em tela
// cheia) não pode viver no layout.tsx em si.
type PropsChrome = { sidebar: React.ReactNode; topbar: React.ReactNode; children: React.ReactNode };

function ChromeNormal({ sidebar, topbar, children }: PropsChrome) {
  return (
    <div className="flex min-h-screen">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        <OfflineBanner />
        <main className="flex-1 px-4 py-8 lg:px-8">
          <BotaoVoltar />
          {children}
        </main>
      </div>
    </div>
  );
}

function ChromeInterno(props: PropsChrome) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const apresentacaoId = searchParams.get(PARAM_APRESENTACAO);

  // Só entra em modo apresentação se a rota atual for uma das telas do
  // catálogo — sem isso, um `?apresentacao=...` sobrando (favorito antigo,
  // link colado fora de contexto) em QUALQUER uma das 70+ rotas do app
  // (ex.: /configuracoes) prendia a página inteira atrás da tela de "essa
  // apresentação não existe" do ApresentacaoShell, já que ele só renderiza
  // {children} quando a apresentação carrega com sucesso (achado em revisão
  // de código).
  if (apresentacaoId && caminhoElegivel(pathname)) {
    return <ApresentacaoShell apresentacaoId={apresentacaoId}>{props.children}</ApresentacaoShell>;
  }

  return <ChromeNormal {...props} />;
}

export function AppChromeShell(props: PropsChrome) {
  // Fallback null, não uma cópia de ChromeNormal — achado ao vivo (não em
  // review): usar o mesmo formato como fallback e como conteúdo resolvido
  // deixava as duas árvores montadas ao mesmo tempo (uma visível, uma
  // "fantasma" com layout zerado) em toda página do app — Sidebar/Topbar e
  // qualquer Client Component da página (ex. formulário de apresentação)
  // rodavam em dobro, e ferramentas de automação por vezes interagiam com a
  // cópia errada. A rota é sempre dinâmica (cookies/DB na auth), então por
  // documentação do Next.js `useSearchParams` resolve no primeiro render do
  // servidor sem suspender de verdade — o fallback não deveria aparecer na
  // prática; `null` é o valor seguro pro caso raro em que aparecer mesmo
  // assim, em vez de duplicar a árvore inteira.
  return (
    <Suspense fallback={null}>
      <ChromeInterno {...props} />
    </Suspense>
  );
}
