"use client";

import { Bell } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type NotificacaoAlerta = {
  id: string;
  tipo: string;
  enviadoEm: string;
};

const ROTULO_TIPO: Record<string, string> = {
  resumo_equipe: "Resumo diário de vencimentos enviado por e-mail",
};

function formatarQuando(iso: string): string {
  const data = new Date(iso);
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  if (mesmoDia) return `Hoje, ${data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function NotificacoesMenu({ notificacoes }: { notificacoes: NotificacaoAlerta[] }) {
  const hoje = new Date().toDateString();
  const temNovaHoje = notificacoes.some((n) => new Date(n.enviadoEm).toDateString() === hoje);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Notificações">
          <Bell size={19} />
          {temNovaHoje && (
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#B23A2E]" />
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notificacoes.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Nenhuma notificação recente.</p>
        ) : (
          notificacoes.map((n) => (
            <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5 whitespace-normal">
              <span className="text-sm">{ROTULO_TIPO[n.tipo] ?? n.tipo}</span>
              <span className="text-xs text-muted-foreground">{formatarQuando(n.enviadoEm)}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
