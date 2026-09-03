import { ConfiguracoesSubNav } from "./sub-nav";

// Navegação da seção mora na lateral (coluna fixa), não mais acima do
// conteúdo — layout compartilhado evita repetir o wrapper em cada subtela
// (achado em varredura de design, 03/09/2026: ver comentário em sub-nav.tsx).
export default function LayoutConfiguracoes({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl items-start gap-8">
      <ConfiguracoesSubNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
