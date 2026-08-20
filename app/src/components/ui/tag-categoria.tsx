import { corPorNome } from "@/lib/cor-por-nome";
import { cn } from "@/lib/utils";

export function TagCategoria({ nome, className }: { nome: string; className?: string }) {
  const cor = corPorNome(nome);
  return (
    <span
      className={cn("inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-semibold", className)}
      style={{ background: cor.bg, color: cor.texto }}
    >
      {nome}
    </span>
  );
}

export function PontoCategoria({ nome, className }: { nome: string; className?: string }) {
  const cor = corPorNome(nome);
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ background: cor.texto }} />;
}
