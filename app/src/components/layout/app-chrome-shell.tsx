"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PARAM_APRESENTACAO } from "@/lib/apresentacao/sessao";
import { rotaValida } from "@/lib/apresentacao/catalogo";
import { ApresentacaoShell } from "@/components/apresentacao/apresentacao-shell";
import { BotaoVoltar } from "@/components/layout/botao-voltar";

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
  if (apresentacaoId && rotaValida(pathname)) {
    return <ApresentacaoShell apresentacaoId={apresentacaoId}>{props.children}</ApresentacaoShell>;
  }

  return <ChromeNormal {...props} />;
}

export function AppChromeShell(props: PropsChrome) {
  // Fallback = chrome normal, não vazio: no caso raríssimo do Suspense
  // precisar de um instante antes do useSearchParams resolver, é muito mais
  // seguro mostrar a UI de sempre (o caso comum, sem apresentação) do que
  // uma tela em branco.
  return (
    <Suspense fallback={<ChromeNormal {...props} />}>
      <ChromeInterno {...props} />
    </Suspense>
  );
}
