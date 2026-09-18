import Link from "next/link";
import { Compass } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

// Cobre o que ficar fora do grupo (app) — antes disto, qualquer rota
// inexistente caía na página 404 padrão do Next.js, sem nada da identidade
// visual do Finanssi (achado em varredura de conteúdo pré-lançamento,
// 18/09/2026). Sem garantia de sessão aqui (mesmo raciocínio de
// error.tsx), então "voltar" aponta pra raiz, não pro Painel.
export default function NaoEncontrado() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/12 text-primary">
        <Compass size={24} weight="bold" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-bold text-foreground">Página não encontrada</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          O endereço que você tentou acessar não existe ou foi movido. Confira o link, ou volte pro início.
        </p>
      </div>
      <Button asChild size="sm">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
