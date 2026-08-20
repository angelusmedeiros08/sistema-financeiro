"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Coins, Receipt, UserPlus, Truck, ShoppingCart } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const ACOES = [
  { rotulo: "Nova receita", href: "/receitas", icon: Coins, tecla: "r" },
  { rotulo: "Nova despesa", href: "/despesas", icon: Receipt, tecla: "d" },
  { rotulo: "Novo cliente", href: "/clientes/novo", icon: UserPlus, tecla: "l" },
  { rotulo: "Novo fornecedor", href: "/fornecedores/novo", icon: Truck, tecla: "f" },
  { rotulo: "Nova venda", href: "/vendas/nova", icon: ShoppingCart, tecla: "v" },
] as const;

function estaEmCampoDeTexto(alvo: EventTarget | null) {
  if (!(alvo instanceof HTMLElement)) return false;
  const tag = alvo.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || alvo.isContentEditable;
}

export function NovoRegistroMenu() {
  const router = useRouter();

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey || estaEmCampoDeTexto(e.target)) return;
      const acao = ACOES.find((a) => a.tecla === e.key.toLowerCase());
      if (acao) {
        e.preventDefault();
        router.push(acao.href);
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [router]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus size={15} weight="bold" />
          Novo registro
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {ACOES.map((acao) => (
          <DropdownMenuItem key={acao.href} onClick={() => router.push(acao.href)} className="gap-2">
            <acao.icon size={15} />
            {acao.rotulo}
            <DropdownMenuShortcut>Alt+{acao.tecla.toUpperCase()}</DropdownMenuShortcut>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
