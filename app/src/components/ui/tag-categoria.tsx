import { corPorNome } from "@/lib/cor-por-nome";
import { cn } from "@/lib/utils";

// Contorno na cor da categoria (achado em varredura de design, 03/09/2026:
// o preenchimento pastel sem nenhuma borda é o "tag do Notion" reconhecido
// como genérico) — mantém a identidade cromática por nome, só troca fundo
// preenchido por borda + fundo quase transparente.
export function TagCategoria({ nome, className }: { nome: string; className?: string }) {
  const cor = corPorNome(nome);
  return (
    <span
      className={cn("inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-semibold", className)}
      style={{ borderColor: cor.texto, background: cor.bg, color: cor.texto }}
    >
      {nome}
    </span>
  );
}

export function PontoCategoria({ nome, className }: { nome: string; className?: string }) {
  const cor = corPorNome(nome);
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ background: cor.texto }} />;
}
