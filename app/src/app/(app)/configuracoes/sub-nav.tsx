"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITENS = [
  { href: "/configuracoes/centros-custo", rotulo: "Centros de custo" },
  { href: "/configuracoes/contas-financeiras", rotulo: "Contas financeiras" },
  { href: "/configuracoes/recorrencias", rotulo: "Recorrências" },
  { href: "/configuracoes/campos-personalizados", rotulo: "Campos personalizados" },
  { href: "/configuracoes/estrutura-dre", rotulo: "Estrutura de DRE" },
  { href: "/configuracoes/orcamento", rotulo: "Orçamento" },
  { href: "/configuracoes/equipe", rotulo: "Equipe" },
] as const;

export function ConfiguracoesSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-border pb-3">
      {ITENS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            pathname.startsWith(item.href) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {item.rotulo}
        </Link>
      ))}
    </div>
  );
}
