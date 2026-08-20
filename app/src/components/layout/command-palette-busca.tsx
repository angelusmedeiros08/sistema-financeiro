"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TODOS_ITENS_FOLHA } from "./sidebar";

function estaEmCampoDeTexto(alvo: EventTarget | null) {
  if (!(alvo instanceof HTMLElement)) return false;
  const tag = alvo.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || alvo.isContentEditable;
}

export function CommandPaletteBusca() {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAberto((v) => !v);
        return;
      }
      if (e.key === "/" && !estaEmCampoDeTexto(e.target)) {
        e.preventDefault();
        setAberto(true);
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  function irPara(href: string) {
    setAberto(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex h-9 w-full max-w-64 items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary"
      >
        <MagnifyingGlass size={15} />
        <span className="flex-1 text-left">Pesquisar</span>
        <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog open={aberto} onOpenChange={setAberto} title="Pesquisar" description="Navegar rapidamente pelo sistema">
        <CommandInput placeholder="Ir para uma tela..." />
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>
          <CommandGroup heading="Telas">
            {TODOS_ITENS_FOLHA.map((item) => (
              <CommandItem key={item.href} value={item.label} onSelect={() => irPara(item.href)}>
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
