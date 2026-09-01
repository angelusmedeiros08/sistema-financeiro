"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, User, Receipt, ShoppingCart, Spinner } from "@phosphor-icons/react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TODOS_ITENS_FOLHA } from "./sidebar";
import { buscarGlobal, type ResultadoBusca } from "@/lib/busca/busca-global";

const ICONE_CATEGORIA = {
  cliente: User,
  fornecedor: User,
  lancamento: Receipt,
  venda: ShoppingCart,
} as const;

function estaEmCampoDeTexto(alvo: EventTarget | null) {
  if (!(alvo instanceof HTMLElement)) return false;
  const tag = alvo.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || alvo.isContentEditable;
}

export function CommandPaletteBusca() {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [termoAnterior, setTermoAnterior] = useState(termo);
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ajuste síncrono durante o render (não dentro de efeito) — mesmo padrão
  // já usado em useDelayedPending: reage à mudança de `termo` no próprio
  // corpo do componente, deixando só a chamada assíncrona (debounce +
  // busca) no efeito abaixo.
  if (termo !== termoAnterior) {
    setTermoAnterior(termo);
    if (termo.trim().length < 2) {
      setResultados([]);
      setBuscando(false);
    } else {
      setBuscando(true);
    }
  }

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

  // Debounce de 250ms — mesmo atraso do resto do sistema de loading
  // (useDelayedPending), aqui aplicado na origem (não dispara a busca a
  // cada tecla) em vez de só no indicador visual. O corte por tamanho
  // mínimo já aconteceu no ajuste síncrono acima — aqui só sobra a parte
  // realmente assíncrona (timer + chamada ao servidor).
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (termo.trim().length < 2) return;
    timerRef.current = setTimeout(async () => {
      const r = await buscarGlobal(termo);
      setResultados(r);
      setBuscando(false);
    }, 250);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [termo]);

  function irPara(href: string) {
    setAberto(false);
    setTermo("");
    router.push(href);
  }

  const gruposResultado = (["cliente", "fornecedor", "lancamento", "venda"] as const)
    .map((categoria) => ({ categoria, itens: resultados.filter((r) => r.categoria === categoria) }))
    .filter((g) => g.itens.length > 0);

  const ROTULO_CATEGORIA: Record<ResultadoBusca["categoria"], string> = {
    cliente: "Clientes",
    fornecedor: "Fornecedores",
    lancamento: "Lançamentos",
    venda: "Vendas",
  };

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

      <CommandDialog open={aberto} onOpenChange={setAberto} title="Pesquisar" description="Navegar ou buscar cliente, fornecedor, lançamento e venda">
        <CommandInput placeholder="Ir para uma tela, ou buscar por nome..." value={termo} onValueChange={setTermo} />
        <CommandList>
          {!buscando && resultados.length === 0 && <CommandEmpty>Nada encontrado.</CommandEmpty>}

          {buscando && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Spinner size={12} className="animate-spin" />
              Buscando...
            </div>
          )}

          {gruposResultado.map((grupo) => {
            const Icone = ICONE_CATEGORIA[grupo.categoria];
            return (
              <CommandGroup key={grupo.categoria} heading={ROTULO_CATEGORIA[grupo.categoria]}>
                {grupo.itens.map((item) => (
                  <CommandItem key={item.href} value={item.titulo} onSelect={() => irPara(item.href)}>
                    <Icone size={15} className="shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{item.titulo}</span>
                    {item.subtitulo && <span className="shrink-0 text-xs text-muted-foreground">{item.subtitulo}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}

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
